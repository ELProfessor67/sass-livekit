"""
RAG (Retrieval-Augmented Generation) Service for LiveKit Agents
Integrates with Pinecone knowledge bases to provide context for voice agents
"""

import os
import json
import logging
import asyncio
from typing import Optional, Dict, List, Any
from dataclasses import dataclass

try:
    from supabase import create_client, Client
except ImportError:
    create_client = None
    Client = object

try:
    from pinecone import Pinecone
except ImportError:
    Pinecone = None

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
        self._initialize_clients()
    
    def _initialize_clients(self):
        """Initialize Supabase and Pinecone clients"""
        # Initialize Supabase
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
        
        # Initialize Pinecone
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
        """Get knowledge base information from database"""
        if not self.supabase:
            logging.warning("RAG_SERVICE | Supabase not available for knowledge base lookup")
            return None
        
        try:
            response = self.supabase.table("knowledge_bases").select("*").eq("id", knowledge_base_id).single().execute()
            if response.data:
                logging.info(f"RAG_SERVICE | Retrieved knowledge base info for {knowledge_base_id}")
                return response.data
            else:
                logging.warning(f"RAG_SERVICE | Knowledge base {knowledge_base_id} not found")
                return None
        except Exception as e:
            logging.error(f"RAG_SERVICE | Error fetching knowledge base {knowledge_base_id}: {e}")
            return None
    
    def _generate_assistant_name(self, company_id: str, knowledge_base_id: str) -> str:
        """Generate Pinecone assistant name from company and knowledge base IDs"""
        company_short = company_id[:8] if company_id else "default"
        kb_short = knowledge_base_id[:8] if knowledge_base_id else "unknown"
        return f"{company_short}-{kb_short}-kb"
    
    async def search_knowledge_base(
        self, 
        knowledge_base_id: str, 
        query: str, 
        top_k: int = 16,
        snippet_size: int = 2048
    ) -> Optional[RAGContext]:
        """
        Search knowledge base for relevant context snippets
        
        Args:
            knowledge_base_id: ID of the knowledge base to search
            query: Search query
            top_k: Number of top results to return
            snippet_size: Maximum size of each snippet
            
        Returns:
            RAGContext with retrieved snippets or None if error
        """
        if not self.pinecone:
            logging.warning("RAG_SERVICE | Pinecone not available for knowledge base search")
            return None
        
        try:
            # Get knowledge base info to extract company_id
            kb_info = await self.get_knowledge_base_info(knowledge_base_id)
            if not kb_info:
                logging.error(f"RAG_SERVICE | Could not retrieve knowledge base info for {knowledge_base_id}")
                return None
            
            company_id = kb_info.get("company_id")
            if not company_id:
                logging.error(f"RAG_SERVICE | No company_id found for knowledge base {knowledge_base_id}")
                return None
            
            # Generate assistant name
            assistant_name = self._generate_assistant_name(company_id, knowledge_base_id)
            logging.info(f"RAG_SERVICE | Using assistant '{assistant_name}' for query: '{query}'")
            
            # Get assistant instance using the correct API
            assistant = self.pinecone.assistant.Assistant(assistant_name)
            
            # Search for context snippets
            response = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: assistant.context(
                    query=query,
                    top_k=top_k,
                    snippet_size=snippet_size
                )
            )
            
            snippets = response.snippets or []
            logging.info(f"RAG_SERVICE | Retrieved {len(snippets)} context snippets")
            
            # Calculate average relevance score
            avg_relevance = 0.0
            if snippets:
                scores = [snippet.get("score", 0.0) for snippet in snippets if "score" in snippet]
                avg_relevance = sum(scores) / len(scores) if scores else 0.0
            
            # Extract file types and unique files
            file_types = []
            unique_files = set()
            
            for snippet in snippets:
                if "reference" in snippet and "file" in snippet["reference"]:
                    file_info = snippet["reference"]["file"]
                    if "type" in file_info:
                        file_types.append(file_info["type"])
                    if "name" in file_info:
                        unique_files.add(file_info["name"])
            
            return RAGContext(
                snippets=snippets,
                query=query,
                knowledge_base_id=knowledge_base_id,
                total_snippets=len(snippets),
                average_relevance=avg_relevance,
                file_types=list(set(file_types)),
                unique_files=len(unique_files)
            )
            
        except Exception as e:
            logging.error(f"RAG_SERVICE | Error searching knowledge base {knowledge_base_id}: {e}")
            return None
    
    async def get_enhanced_context(
        self, 
        knowledge_base_id: str, 
        query: str,
        max_context_length: int = 4000
    ) -> Optional[str]:
        """
        Get enhanced context from knowledge base, formatted for LLM consumption
        
        Args:
            knowledge_base_id: ID of the knowledge base to search
            query: Search query
            max_context_length: Maximum length of context to return
            
        Returns:
            Formatted context string or None if error
        """
        rag_context = await self.search_knowledge_base(knowledge_base_id, query)
        if not rag_context or not rag_context.snippets:
            return None
        
        # Format snippets for LLM consumption
        context_parts = []
        current_length = 0
        
        for i, snippet in enumerate(rag_context.snippets):
            content = snippet.get("content", "")
            if not content:
                continue
            
            # Add snippet with reference info
            snippet_text = f"[Context {i+1}] {content}"
            
            # Add file reference if available
            if "reference" in snippet and "file" in snippet["reference"]:
                file_info = snippet["reference"]["file"]
                file_name = file_info.get("name", "Unknown")
                snippet_text += f" (Source: {file_name})"
            
            # Check if adding this snippet would exceed max length
            if current_length + len(snippet_text) > max_context_length:
                break
            
            context_parts.append(snippet_text)
            current_length += len(snippet_text)
        
        if not context_parts:
            return None
        
        # Combine all context parts
        full_context = "\n\n".join(context_parts)
        
        # Add metadata
        metadata = f"\n\n[Knowledge Base Context: {rag_context.total_snippets} snippets from {rag_context.unique_files} files]"
        full_context += metadata
        
        logging.info(f"RAG_SERVICE | Generated context: {len(full_context)} chars from {len(context_parts)} snippets")
        return full_context
    
    async def search_multiple_queries(
        self, 
        knowledge_base_id: str, 
        queries: List[str],
        max_context_length: int = 4000
    ) -> Optional[str]:
        """
        Search knowledge base with multiple queries and combine results
        
        Args:
            knowledge_base_id: ID of the knowledge base to search
            queries: List of search queries
            max_context_length: Maximum length of context to return
            
        Returns:
            Combined formatted context string or None if error
        """
        if not queries:
            return None
        
        # Search all queries in parallel
        tasks = [
            self.search_knowledge_base(knowledge_base_id, query)
            for query in queries
        ]
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Combine all snippets from successful searches
        all_snippets = []
        for result in results:
            if isinstance(result, RAGContext) and result.snippets:
                all_snippets.extend(result.snippets)
        
        if not all_snippets:
            return None
        
        # Remove duplicates based on content
        unique_snippets = self._deduplicate_snippets(all_snippets)
        
        # Sort by relevance score
        unique_snippets.sort(key=lambda x: x.get("score", 0), reverse=True)
        
        # Format context
        context_parts = []
        current_length = 0
        
        for i, snippet in enumerate(unique_snippets):
            content = snippet.get("content", "")
            if not content:
                continue
            
            snippet_text = f"[Context {i+1}] {content}"
            
            if "reference" in snippet and "file" in snippet["reference"]:
                file_info = snippet["reference"]["file"]
                file_name = file_info.get("name", "Unknown")
                snippet_text += f" (Source: {file_name})"
            
            if current_length + len(snippet_text) > max_context_length:
                break
            
            context_parts.append(snippet_text)
            current_length += len(snippet_text)
        
        if not context_parts:
            return None
        
        full_context = "\n\n".join(context_parts)
        metadata = f"\n\n[Knowledge Base Context: {len(unique_snippets)} snippets from multiple queries]"
        full_context += metadata
        
        logging.info(f"RAG_SERVICE | Generated multi-query context: {len(full_context)} chars from {len(unique_snippets)} unique snippets")
        return full_context
    
    def _deduplicate_snippets(self, snippets: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Remove duplicate snippets based on content similarity"""
        seen = set()
        unique = []
        
        for snippet in snippets:
            content = snippet.get("content", "")
            if not content:
                continue
            
            # Simple hash for deduplication
            content_hash = hash(content.lower().strip())
            if content_hash not in seen:
                seen.add(content_hash)
                unique.append(snippet)
        
        return unique

# Global RAG service instance
rag_service = RAGService()
