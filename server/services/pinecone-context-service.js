import { Pinecone } from '@pinecone-database/pinecone';

class PineconeContextService {
  constructor() {
    this.pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY
    });
  }

  /**
   * Generate assistant name from company and knowledge base IDs
   * @param {string} companyId - The company ID
   * @param {string} knowledgeBaseId - The knowledge base ID
   * @returns {string} Generated assistant name
   */
  generateAssistantName(companyId, knowledgeBaseId) {
    const companyShort = companyId.substring(0, 8);
    const kbShort = knowledgeBaseId.substring(0, 8);
    return `${companyShort}-${kbShort}-kb`;
  }

  /**
   * Retrieve context snippets from a Pinecone Assistant using chat API
   * @param {string} companyId - The company ID
   * @param {string} knowledgeBaseId - The knowledge base ID
   * @param {string} query - The search query
   * @param {Object} options - Context retrieval options
   * @returns {Promise<Object>} Context snippets response
   */
  async getContextSnippets(companyId, knowledgeBaseId, query, options = {}) {
    try {
      console.log(`Retrieving context snippets for KB ${knowledgeBaseId} with query: "${query}"`);
      
      // Generate assistant name
      const assistantName = this.generateAssistantName(companyId, knowledgeBaseId);
      
      // Get assistant instance
      const assistant = this.pinecone.Assistant(assistantName);
      
      // Default options for context
      const defaultOptions = {
        topK: 16,
        snippetSize: 2048
      };
      
      // Merge with provided options
      const contextOptions = { ...defaultOptions, ...options };
      
      console.log(`Using assistant '${assistantName}' with options:`, contextOptions);
      
      // Use chat API to get context snippets
      const response = await assistant.chat({
        messages: [{ role: 'user', content: query }],
        contextOptions: {
          topK: contextOptions.topK,
          snippetSize: contextOptions.snippetSize
        }
      });
      
      // Extract snippets from citations
      const snippets = response.citations?.map(citation => ({
        content: citation.references?.[0]?.highlight?.content || '',
        score: 1.0, // Default score since chat API doesn't provide relevance scores
        reference: citation.references?.[0]
      })) || [];
      
      console.log(`Retrieved ${snippets.length} context snippets from chat response`);
      
      return {
        success: true,
        snippets: snippets,
        query: query,
        assistantName: assistantName,
        options: contextOptions,
        response: response
      };

    } catch (error) {
      console.error(`Error retrieving context snippets for KB ${knowledgeBaseId}:`, error);
      
      // Handle specific Pinecone errors
      if (error.message?.includes('not found') || error.message?.includes('does not exist')) {
        return {
          success: false,
          error: 'Assistant not found. Please ensure the knowledge base has been properly set up.',
          code: 'ASSISTANT_NOT_FOUND'
        };
      }
      
      if (error.message?.includes('unauthorized') || error.message?.includes('forbidden')) {
        return {
          success: false,
          error: 'Unauthorized access to assistant.',
          code: 'UNAUTHORIZED'
        };
      }
      
      return {
        success: false,
        error: error.message,
        code: 'UNKNOWN_ERROR'
      };
    }
  }

  /**
   * Get context snippets with enhanced metadata
   * @param {string} companyId - The company ID
   * @param {string} knowledgeBaseId - The knowledge base ID
   * @param {string} query - The search query
   * @param {Object} options - Context retrieval options
   * @returns {Promise<Object>} Enhanced context snippets response
   */
  async getEnhancedContextSnippets(companyId, knowledgeBaseId, query, options = {}) {
    try {
      const result = await this.getContextSnippets(companyId, knowledgeBaseId, query, options);
      
      if (!result.success) {
        return result;
      }

      // Enhance snippets with additional metadata
      const enhancedSnippets = result.snippets.map((snippet, index) => ({
        ...snippet,
        id: `snippet_${index}`,
        relevance_score: snippet.score || 0,
        snippet_type: snippet.type || 'text',
        content_preview: snippet.content ? snippet.content.substring(0, 200) + '...' : '',
        has_reference: !!(snippet.reference),
        file_name: snippet.reference?.file?.name || 'Unknown',
        file_type: snippet.reference?.type || 'unknown',
        page_numbers: snippet.reference?.pages || [],
        file_size: snippet.reference?.file?.size || 0,
        file_status: snippet.reference?.file?.status || 'unknown',
        created_at: snippet.reference?.file?.created_on || null,
        updated_at: snippet.reference?.file?.updated_on || null,
        signed_url: snippet.reference?.file?.signed_url || null,
        signed_url_expires: snippet.reference?.file?.signed_url ? 
          new Date(Date.now() + 60 * 60 * 1000).toISOString() : null // 1 hour from now
      }));

      return {
        ...result,
        snippets: enhancedSnippets,
        total_snippets: enhancedSnippets.length,
        average_relevance: enhancedSnippets.length > 0 ? 
          enhancedSnippets.reduce((sum, s) => sum + s.relevance_score, 0) / enhancedSnippets.length : 0,
        file_types: [...new Set(enhancedSnippets.map(s => s.file_type))],
        unique_files: [...new Set(enhancedSnippets.map(s => s.file_name))].length
      };

    } catch (error) {
      console.error(`Error getting enhanced context snippets:`, error);
      return {
        success: false,
        error: error.message,
        code: 'ENHANCEMENT_ERROR'
      };
    }
  }

  /**
   * Search for context snippets with multiple queries
   * @param {string} companyId - The company ID
   * @param {string} knowledgeBaseId - The knowledge base ID
   * @param {string[]} queries - Array of search queries
   * @param {Object} options - Context retrieval options
   * @returns {Promise<Object>} Combined context snippets response
   */
  async searchMultipleQueries(companyId, knowledgeBaseId, queries, options = {}) {
    try {
      console.log(`Searching multiple queries for KB ${knowledgeBaseId}:`, queries);
      
      const results = await Promise.all(
        queries.map(query => 
          this.getEnhancedContextSnippets(companyId, knowledgeBaseId, query, options)
        )
      );

      // Combine all snippets
      const allSnippets = results
        .filter(result => result.success)
        .flatMap(result => result.snippets);

      // Remove duplicates based on content similarity
      const uniqueSnippets = this.deduplicateSnippets(allSnippets);

      // Sort by relevance score
      uniqueSnippets.sort((a, b) => b.relevance_score - a.relevance_score);

      return {
        success: true,
        snippets: uniqueSnippets,
        total_snippets: uniqueSnippets.length,
        queries_processed: queries.length,
        successful_queries: results.filter(r => r.success).length,
        average_relevance: uniqueSnippets.length > 0 ? 
          uniqueSnippets.reduce((sum, s) => sum + s.relevance_score, 0) / uniqueSnippets.length : 0,
        file_types: [...new Set(uniqueSnippets.map(s => s.file_type))],
        unique_files: [...new Set(uniqueSnippets.map(s => s.file_name))].length
      };

    } catch (error) {
      console.error(`Error searching multiple queries:`, error);
      return {
        success: false,
        error: error.message,
        code: 'MULTI_QUERY_ERROR'
      };
    }
  }

  /**
   * Remove duplicate snippets based on content similarity
   * @param {Array} snippets - Array of snippets to deduplicate
   * @returns {Array} Deduplicated snippets
   */
  deduplicateSnippets(snippets) {
    const seen = new Set();
    const unique = [];

    for (const snippet of snippets) {
      // Create a simple hash of the content for deduplication
      const contentHash = this.createContentHash(snippet.content);
      
      if (!seen.has(contentHash)) {
        seen.add(contentHash);
        unique.push(snippet);
      }
    }

    return unique;
  }

  /**
   * Create a simple hash for content deduplication
   * @param {string} content - Content to hash
   * @returns {string} Content hash
   */
  createContentHash(content) {
    if (!content) return '';
    
    // Simple hash function for deduplication
    let hash = 0;
    const str = content.toLowerCase().trim();
    
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return hash.toString();
  }

  /**
   * Get context snippets with file filtering
   * @param {string} companyId - The company ID
   * @param {string} knowledgeBaseId - The knowledge base ID
   * @param {string} query - The search query
   * @param {Object} filters - Filter options
   * @param {Object} options - Context retrieval options
   * @returns {Promise<Object>} Filtered context snippets response
   */
  async getFilteredContextSnippets(companyId, knowledgeBaseId, query, filters = {}, options = {}) {
    try {
      const result = await this.getEnhancedContextSnippets(companyId, knowledgeBaseId, query, options);
      
      if (!result.success) {
        return result;
      }

      let filteredSnippets = result.snippets;

      // Apply file type filter
      if (filters.file_types && filters.file_types.length > 0) {
        filteredSnippets = filteredSnippets.filter(snippet => 
          filters.file_types.includes(snippet.file_type)
        );
      }

      // Apply file name filter
      if (filters.file_names && filters.file_names.length > 0) {
        filteredSnippets = filteredSnippets.filter(snippet => 
          filters.file_names.some(name => snippet.file_name.includes(name))
        );
      }

      // Apply minimum relevance score filter
      if (filters.min_relevance_score !== undefined) {
        filteredSnippets = filteredSnippets.filter(snippet => 
          snippet.relevance_score >= filters.min_relevance_score
        );
      }

      // Apply page number filter
      if (filters.page_numbers && filters.page_numbers.length > 0) {
        filteredSnippets = filteredSnippets.filter(snippet => 
          snippet.page_numbers.some(page => filters.page_numbers.includes(page))
        );
      }

      return {
        ...result,
        snippets: filteredSnippets,
        total_snippets: filteredSnippets.length,
        filters_applied: filters,
        original_count: result.snippets.length
      };

    } catch (error) {
      console.error(`Error getting filtered context snippets:`, error);
      return {
        success: false,
        error: error.message,
        code: 'FILTER_ERROR'
      };
    }
  }
}

export default PineconeContextService;
