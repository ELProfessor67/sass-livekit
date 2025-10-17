"""
RAG (Retrieval-Augmented Generation) Service for LiveKit Agents
Integrates with Pinecone knowledge bases to provide context for voice agents
"""

import os
import logging
import asyncio
import hashlib
import time
from typing import Optional, Dict, List, Any
from dataclasses import dataclass
from functools import lru_cache

try:
    from supabase import create_client, Client
except ImportError:
    create_client = None
    Client = object

try:
    from pinecone import Pinecone
except ImportError:
    Pinecone = None

from utils.latency_logger import measure_latency_context

# Cache configuration
_cache_ttl = 300  # 5 minutes cache TTL
_cache_max_size = 100  # Maximum cache entries
_rag_cache: Dict[str, tuple] = {}  # Global cache for RAG queries

def _get_cache_key(knowledge_base_id: str, query: str) -> str:
    """Generate cache key for RAG query."""
    return hashlib.md5(f"{knowledge_base_id}:{query.lower().strip()}".encode()).hexdigest()

def _is_cache_valid(timestamp: float) -> bool:
    """Check if cache entry is still valid."""
    return time.time() - timestamp < _cache_ttl

def _clean_cache():
    """Remove expired entries from cache."""
    current_time = time.time()
    expired_keys = [
        key for key, (_, timestamp) in _rag_cache.items()
        if current_time - timestamp > _cache_ttl
    ]
    for key in expired_keys:
        del _rag_cache[key]
    
    # If still over limit, remove oldest entries
    if len(_rag_cache) > _cache_max_size:
        sorted_items = sorted(_rag_cache.items(), key=lambda x: x[1][1])
        for key, _ in sorted_items[:len(_rag_cache) - _cache_max_size]:
            del _rag_cache[key]

@dataclass
class RAGContext:
    """Context retrieved from knowledge base"""
    snippets: List[Dict[str, Any]]
    query: str
    knowledge_base_id: str
    total_snippets: int
    average_relevance: float
    file_types: List[str]
    unique_files: int

class RAGService:
    """Service for retrieving context from knowledge bases using Pinecone"""

    def __init__(self):
        self.supabase: Optional[Client] = None
        self.pinecone = None
        # in-process caches
        self._kb_cache: Dict[str, Dict[str, Any]] = {}               # kb_id -> kb_info
        self._assistant_cache: Dict[str, Any] = {}                   # assistant_name -> assistant
        self._initialize_clients()

    def _initialize_clients(self):
        """Initialize Supabase and Pinecone clients"""
        if create_client:
            supabase_url = os.getenv("SUPABASE_URL", "").strip()
            supabase_key = (
                os.getenv("SUPABASE_SERVICE_ROLE", "").strip()
                or os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()
            )
            if supabase_url and supabase_key:
                self.supabase = create_client(supabase_url, supabase_key)
                logging.info("RAG_SERVICE | Supabase client initialized")
            else:
                logging.warning("RAG_SERVICE | Supabase credentials not configured")
        else:
            logging.warning("RAG_SERVICE | Supabase client not available")

        if Pinecone:
            pinecone_api_key = os.getenv("PINECONE_API_KEY", "").strip()
            if pinecone_api_key:
                self.pinecone = Pinecone(api_key=pinecone_api_key)
                logging.info("RAG_SERVICE | Pinecone client initialized")
            else:
                logging.warning("RAG_SERVICE | Pinecone API key not configured")
        else:
            logging.warning("RAG_SERVICE | Pinecone client not available")

    async def get_knowledge_base_info(self, knowledge_base_id: str) -> Optional[Dict[str, Any]]:
        """Get knowledge base information from database (cached in-process)"""
        if knowledge_base_id in self._kb_cache:
            return self._kb_cache[knowledge_base_id]

        if not self.supabase:
            logging.warning("RAG_SERVICE | Supabase not available for knowledge base lookup")
            return None

        try:
            response = (
                self.supabase.table("knowledge_bases")
                .select("*").eq("id", knowledge_base_id).single().execute()
            )
            if response.data:
                self._kb_cache[knowledge_base_id] = response.data
                logging.info("RAG_SERVICE | Retrieved knowledge base info for %s", knowledge_base_id)
                return response.data
            logging.warning("RAG_SERVICE | Knowledge base %s not found", knowledge_base_id)
            return None
        except Exception as e:
            logging.error("RAG_SERVICE | Error fetching knowledge base %s: %s", knowledge_base_id, e)
            return None

    def _generate_assistant_name(self, company_id: str, knowledge_base_id: str) -> str:
        company_short = company_id[:8] if company_id else "default"
        kb_short = knowledge_base_id[:8] if knowledge_base_id else "unknown"
        return f"{company_short}-{kb_short}-kb"

    def _get_assistant(self, company_id: str, knowledge_base_id: str):
        """Create/reuse a Pinecone assistant object per KB (cuts latency a ton)."""
        if not self.pinecone:
            return None
        name = self._generate_assistant_name(company_id, knowledge_base_id)
        if name in self._assistant_cache:
            return self._assistant_cache[name]
        assistant = self.pinecone.assistant.Assistant(name)
        self._assistant_cache[name] = assistant
        return assistant

    async def search_knowledge_base(
        self,
        knowledge_base_id: str,
        query: str,
        top_k: int = 8,               # lowered default for speed
        snippet_size: int = 1536,     # slightly smaller chunks for speed
    ) -> Optional[RAGContext]:
        """Search knowledge base for relevant context snippets with aggressive caching and rate limiting"""
        # Rate limiting: prevent too many concurrent requests
        if not hasattr(self, '_request_count'):
            self._request_count = 0
            self._last_request_time = 0
        
        current_time = time.time()
        time_since_last = current_time - self._last_request_time
        
        # If requests are too frequent, add a small delay
        if time_since_last < 0.5:  # Minimum 500ms between requests
            await asyncio.sleep(0.5 - time_since_last)
        
        self._request_count += 1
        self._last_request_time = time.time()
        
        call_id = f"rag_{knowledge_base_id}"  # Use knowledge base ID as call identifier
        
        # Check cache first for massive speed improvement
        cache_key = _get_cache_key(knowledge_base_id, query)
        if cache_key in _rag_cache:
            cached_result, timestamp = _rag_cache[cache_key]
            if _is_cache_valid(timestamp):
                logging.info("RAG_SERVICE | Cache HIT | query=%s | saved_time=4.8s", query[:50])
                return cached_result
            else:
                # Remove expired entry
                del _rag_cache[cache_key]
        
        # Clean cache periodically
        if len(_rag_cache) > _cache_max_size * 0.8:
            _clean_cache()
        
        async with measure_latency_context("rag_knowledge_base_search", call_id, {
            "knowledge_base_id": knowledge_base_id,
            "query_length": len(query),
            "top_k": top_k,
            "snippet_size": snippet_size
        }):
            if not self.pinecone:
                logging.warning("RAG_SERVICE | Pinecone not available for knowledge base search")
                return None

            try:
                kb_info = await self.get_knowledge_base_info(knowledge_base_id)
                if not kb_info:
                    logging.error("RAG_SERVICE | Could not retrieve knowledge base info for %s", knowledge_base_id)
                    return None
                company_id = kb_info.get("company_id")
                if not company_id:
                    logging.error("RAG_SERVICE | No company_id found for knowledge base %s", knowledge_base_id)
                    return None

                assistant = self._get_assistant(company_id, knowledge_base_id)
                if not assistant:
                    logging.error("RAG_SERVICE | Assistant unavailable")
                    return None

                # Pinecone python client is sync → run in thread with exponential backoff
                max_retries = 3
                base_delay = 1.0
                
                for attempt in range(max_retries):
                    try:
                        resp = await asyncio.get_event_loop().run_in_executor(
                            None,
                            lambda: assistant.context(query=query, top_k=top_k, snippet_size=snippet_size),
                        )
                        break  # Success, exit retry loop
                    except Exception as e:
                        if attempt < max_retries - 1:
                            delay = base_delay * (2 ** attempt)  # Exponential backoff
                            logging.warning(f"RAG_SERVICE_RETRY | attempt={attempt + 1} | delay={delay}s | error={str(e)}")
                            await asyncio.sleep(delay)
                        else:
                            logging.error(f"RAG_SERVICE_FAILED | max_retries_reached | error={str(e)}")
                            raise
                
                snippets = getattr(resp, "snippets", None) or (resp.get("snippets", []) if isinstance(resp, dict) else [])
                logging.info("RAG_SERVICE | Retrieved %d context snippets", len(snippets))

                avg = 0.0
                if snippets:
                    scores = [s.get("score", 0.0) for s in snippets if isinstance(s, dict)]
                    avg = (sum(scores) / len(scores)) if scores else 0.0

                file_types: List[str] = []
                unique_files = set()
                for s in snippets:
                    ref = s.get("reference", {})
                    f = ref.get("file", {}) if isinstance(ref, dict) else {}
                    if "type" in f: file_types.append(f["type"])
                    if "name" in f: unique_files.add(f["name"])

                result = RAGContext(
                    snippets=snippets,
                    query=query,
                    knowledge_base_id=knowledge_base_id,
                    total_snippets=len(snippets),
                    average_relevance=avg,
                    file_types=list(set(file_types)),
                    unique_files=len(unique_files),
                )
                
                # Cache the result for future queries
                _rag_cache[cache_key] = (result, time.time())
                logging.info("RAG_SERVICE | Cache STORED | query=%s | cache_size=%d", query[:50], len(_rag_cache))
                
                return result
            except Exception as e:
                logging.error("RAG_SERVICE | Error searching knowledge base %s: %s", knowledge_base_id, e)
                return None

    async def get_enhanced_context(
        self,
        knowledge_base_id: str,
        query: str,
        max_context_length: int = 8000,
    ) -> Optional[str]:
        """Get enhanced, formatted context from top results."""
        rag_context = await self.search_knowledge_base(knowledge_base_id, query)
        if not rag_context or not rag_context.snippets:
            return None

        parts: List[str] = []
        used = 0
        for i, s in enumerate(rag_context.snippets, 1):
            content = s.get("content") or s.get("text") or ""
            if not content:
                continue
            snippet_text = f"[Context {i}] {content}"
            ref = s.get("reference", {})
            f = ref.get("file", {}) if isinstance(ref, dict) else {}
            if f.get("name"):
                snippet_text += f" (Source: {f['name']})"
            if used + len(snippet_text) > max_context_length:
                break
            parts.append(snippet_text)
            used += len(snippet_text)

        if not parts:
            return None
        full = "\n\n".join(parts)
        full += f"\n\n[Knowledge Base Context: {rag_context.total_snippets} snippets from {rag_context.unique_files} files]"
        logging.info("RAG_SERVICE | Generated context: %d chars", len(full))
        return full

    async def search_multiple_queries(
        self,
        knowledge_base_id: str,
        queries: List[str],
        max_context_length: int = 8000,
    ) -> Optional[str]:
        """
        Search the KB with multiple queries while reusing the KB lookup and the Pinecone assistant to reduce latency.
        """
        call_id = f"rag_multi_{knowledge_base_id}"  # Use knowledge base ID as call identifier
        
        async with measure_latency_context("rag_multiple_queries_search", call_id, {
            "knowledge_base_id": knowledge_base_id,
            "query_count": len(queries),
            "max_context_length": max_context_length
        }):
            if not self.pinecone:
                logging.warning("RAG_SERVICE | Pinecone not available for multi-query search")
                return None
            if not queries:
                return None

            kb_info = await self.get_knowledge_base_info(knowledge_base_id)
            if not kb_info:
                logging.error("RAG_SERVICE | Could not retrieve knowledge base info for %s", knowledge_base_id)
                return None
            company_id = kb_info.get("company_id")
            if not company_id:
                logging.error("RAG_SERVICE | No company_id found for knowledge base %s", knowledge_base_id)
                return None

            assistant = self._get_assistant(company_id, knowledge_base_id)
            if not assistant:
                logging.error("RAG_SERVICE | Assistant unavailable")
                return None

        # unique, non-empty queries
        qset = list(dict.fromkeys([q for q in (queries or []) if q and q.strip()]))
        loop = asyncio.get_event_loop()

        def fetch(q: str):
            return assistant.context(query=q, top_k=8, snippet_size=1536)

        try:
            responses = await asyncio.gather(
                *[loop.run_in_executor(None, (lambda q=q: fetch(q))) for q in qset],
                return_exceptions=True,
            )
        except Exception as e:
            logging.error("RAG_SERVICE | Multi-query executor error: %s", e)
            return None

        all_snips: List[Dict[str, Any]] = []
        for resp in responses:
            if isinstance(resp, Exception):
                logging.warning("RAG_SERVICE | One query failed: %s", resp)
                continue
            snips = getattr(resp, "snippets", None) or (resp.get("snippets", []) if isinstance(resp, dict) else [])
            if snips:
                all_snips.extend(snips)

        if not all_snips:
            return None

        unique_snips = self._deduplicate_snippets(all_snips)
        unique_snips.sort(key=lambda x: x.get("score", 0.0), reverse=True)

        parts: List[str] = []
        used = 0
        for i, s in enumerate(unique_snips, 1):
            content = s.get("content") or s.get("text") or ""
            if not content:
                continue
            text = f"[Context {i}] {content}"
            ref = s.get("reference", {})
            f = ref.get("file", {}) if isinstance(ref, dict) else {}
            if f.get("name"):
                text += f" (Source: {f['name']})"
            if used + len(text) > max_context_length:
                break
            parts.append(text)
            used += len(text)

        if not parts:
            return None

        full = "\n\n".join(parts)
        full += f"\n\n[Knowledge Base Context: {len(unique_snips)} unique snippets across {len(qset)} queries]"
        logging.info("RAG_SERVICE | Multi-query context built | chars=%d | snippets=%d | queries=%d",
                     len(full), len(unique_snips), len(qset))
        return full

    def _deduplicate_snippets(self, snippets: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Remove duplicate snippets based on content"""
        seen = set()
        unique = []
        for s in snippets:
            content = (s.get("content") or s.get("text") or "").strip().lower()
            if not content:
                continue
            h = hash(content)
            if h not in seen:
                seen.add(h)
                unique.append(s)
        return unique

# ---- Singleton factory (prevents double initialization seen in logs) ----
_service_singleton: Optional[RAGService] = None

def get_rag_service() -> RAGService:
    global _service_singleton
    if _service_singleton is None:
        _service_singleton = RAGService()
    return _service_singleton