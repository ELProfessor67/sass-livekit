import React from "react";
import { Clock, Plus } from "phosphor-react";
import {
    GoHighLevelIcon,
    HubSpotIcon,
    ShopifyIcon,
    SlackIcon,
    GmailIcon,
    KlaviyoIcon,
    GoogleSheetsIcon,
    AirtableIcon,
    NotionIcon,
    WebhookIcon,
    HttpIcon,
    OpenAIIcon,
    GeminiIcon,
    ClaudeIcon,
    TwilioIcon,
    TelnyxIcon,
    WhatsAppIcon,
    CalcomIcon,
    ConditionIcon,
    FacebookIcon,
} from "@/components/composer/nodes/IntegrationIcons";

export interface IntegrationAction {
    id: string;
    label: string;
    description: string;
}

export interface Integration {
    type: string;
    label: string;
    description: string;
}

export interface IntegrationCategory {
    name: string;
    nodes: Integration[];
}

export const integrationTriggers: Record<string, IntegrationAction[]> = {
    'Facebook': [
        { id: 'facebook_leads', label: 'Facebook Lead Created', description: 'Trigger when a new lead is captured from Facebook' },
    ],
    'HubSpot': [
        // Contact Triggers
        { id: 'hubspot_contact_created', label: 'New Contact', description: 'Trigger when a new contact is created in HubSpot' },
        { id: 'hubspot_contact_updated', label: 'Contact Recently Created or Updated', description: 'Trigger when a contact is added or modified' },
        { id: 'hubspot_contact_in_list', label: 'New Contact in List', description: 'Trigger when a contact is added to a specific list' },
        { id: 'hubspot_contact_property_change', label: 'New Contact Property Change', description: 'Trigger when a selected contact property changes' },

        // Company Triggers
        { id: 'hubspot_company_created', label: 'New Company', description: 'Trigger when a company is created' },
        { id: 'hubspot_company_updated', label: 'Company Recently Created or Updated', description: 'Trigger when a company is added or modified' },
        { id: 'hubspot_company_property_change', label: 'New Company Property Change', description: 'Trigger when a selected company property changes' },

        // Deal Triggers
        { id: 'hubspot_deal_created', label: 'New Deal', description: 'Trigger when a deal is created' },
        { id: 'hubspot_deal_property_change', label: 'New Deal Property Change', description: 'Trigger when a deal property is updated' },
        { id: 'hubspot_deal_stage_updated', label: 'Updated Deal Stage', description: 'Trigger when a deal enters a specific stage' },

        // Line Item & Product Triggers
        { id: 'hubspot_line_item_created', label: 'New Line Item', description: 'Trigger when a line item is created' },
        { id: 'hubspot_line_item_updated', label: 'Line Item Recently Created or Updated', description: 'Trigger when a line item is added or modified' },
        { id: 'hubspot_product_created', label: 'New Product', description: 'Trigger when a product is created' },
        { id: 'hubspot_product_updated', label: 'Product Recently Created or Updated', description: 'Trigger when a product is added or modified' },

        // Ticket Triggers
        { id: 'hubspot_ticket_created', label: 'New Ticket', description: 'Trigger when a ticket is created' },
        { id: 'hubspot_ticket_property_change', label: 'New Ticket Property Change', description: 'Trigger when a ticket property changes' },

        // Task & Engagement Triggers
        { id: 'hubspot_task_created', label: 'New Task', description: 'Trigger when a task is created' },
        { id: 'hubspot_engagement_created', label: 'New Engagement', description: 'Trigger when an engagement is logged' },

        // Email & Communication Triggers
        { id: 'hubspot_email_event', label: 'New Email Event', description: 'Trigger when a tracked email event occurs' },
        { id: 'hubspot_email_subscription_changed', label: 'New Email Subscriptions Timeline', description: 'Trigger when an email subscription is added' },

        // Forms & Content Triggers
        { id: 'hubspot_form_submitted', label: 'New Form Submission', description: 'Trigger when a form is submitted' },
        { id: 'hubspot_blog_article_published', label: 'New COS Blog Article', description: 'Trigger when a blog post is published' },

        // Custom Object Triggers
        { id: 'hubspot_custom_object_created', label: 'New Custom Object', description: 'Trigger when a custom object is created' },
        { id: 'hubspot_custom_object_property_change', label: 'New Custom Object Property Change', description: 'Trigger when a custom object property changes' },
    ],
    'GoHighLevel': [
        { id: 'ghl_contact_created', label: 'Contact Created', description: 'Trigger when a new contact is created in GoHighLevel' },
    ],
    'Webhook': [
        { id: 'webhook', label: 'End Of Call', description: 'Trigger after a call ends' },
    ],
    'Schedule': [
        { id: 'schedule', label: 'Schedule', description: 'Trigger at a specific time' },
    ],
    'Manual': [
        { id: 'manual', label: 'Manual Trigger', description: 'Trigger manually from dashboard' },
    ],
};

export const integrationActions: Record<string, IntegrationAction[]> = {
    'GoHighLevel': [
        { id: 'create_contact', label: 'Create Contact', description: 'Create a new contact in GoHighLevel' },
        { id: 'update_contact', label: 'Update Contact', description: 'Update an existing contact' },
        { id: 'add_to_campaign', label: 'Add to Campaign', description: 'Add contact to a campaign' },
        { id: 'add_tag', label: 'Add Tag', description: 'Add a tag to a contact' },
    ],
    'HubSpot': [
        { id: 'create_company', label: 'Create Company', description: 'Creates a company in HubSpot' },
        { id: 'create_contact', label: 'Create Contact', description: 'Creates a contact in HubSpot' },
        { id: 'create_deal', label: 'Create Deal', description: 'Create a new deal in HubSpot' },
        { id: 'update_contact', label: 'Update Contact', description: 'Updates an existing contact' },
        { id: 'create_associations', label: 'Create Associations', description: 'Creates associations between objects' },
    ],
    'Shopify': [
        { id: 'create_order', label: 'Create Order', description: 'Create a new order in Shopify' },
        { id: 'update_order', label: 'Update Order', description: 'Update an existing order' },
        { id: 'get_product', label: 'Get Product', description: 'Retrieve product details' },
        { id: 'create_customer', label: 'Create Customer', description: 'Create a new customer' },
        { id: 'update_inventory', label: 'Update Inventory', description: 'Update product inventory levels' },
        { id: 'create_product', label: 'Create Product', description: 'Create a new product' },
        { id: 'add_product_tag', label: 'Add Product Tag', description: 'Add tags to a product' },
    ],
    'Slack': [
        { id: 'send_message', label: 'Send Message to Channel', description: 'Send a message to a Slack channel' },
        { id: 'send_direct_message', label: 'Send Direct Message', description: 'Send a direct message to a user' },
        { id: 'create_channel', label: 'Create Channel', description: 'Create a new Slack channel' },
        { id: 'update_message', label: 'Update Message', description: 'Update an existing message' },
        { id: 'add_reaction', label: 'Add Reaction', description: 'Add an emoji reaction to a message' },
        { id: 'upload_file', label: 'Upload File', description: 'Upload a file to a channel' },
    ],
    'Gmail': [
        { id: 'send_email', label: 'Send Email', description: 'Send a new email message' },
        { id: 'reply_to_email', label: 'Reply to Email', description: 'Reply to an existing email' },
        { id: 'create_draft', label: 'Create Draft', description: 'Create an email draft' },
        { id: 'get_email', label: 'Get Email', description: 'Retrieve email details' },
        { id: 'add_label', label: 'Add Label', description: 'Add a label to an email' },
        { id: 'search_emails', label: 'Search Emails', description: 'Search emails by query' },
    ],
    'Klaviyo': [
        { id: 'add_to_list', label: 'Add Profile to List', description: 'Add a profile to a Klaviyo list' },
        { id: 'remove_from_list', label: 'Remove from List', description: 'Remove a profile from a list' },
        { id: 'track_event', label: 'Track Event', description: 'Track a custom event for a profile' },
        { id: 'update_profile', label: 'Update Profile', description: 'Update profile properties' },
        { id: 'create_profile', label: 'Create Profile', description: 'Create a new profile' },
        { id: 'get_profile', label: 'Get Profile', description: 'Retrieve profile details' },
    ],
    'Google Sheets': [
        { id: 'read_row', label: 'Read Row', description: 'Read data from a specific row' },
        { id: 'write_row', label: 'Write Row', description: 'Write data to a new row' },
        { id: 'update_row', label: 'Update Row', description: 'Update an existing row' },
        { id: 'delete_row', label: 'Delete Row', description: 'Delete a row from the sheet' },
        { id: 'create_spreadsheet', label: 'Create Spreadsheet', description: 'Create a new spreadsheet' },
        { id: 'find_row', label: 'Find Row', description: 'Find a row by column value' },
        { id: 'clear_range', label: 'Clear Range', description: 'Clear a range of cells' },
    ],
    'Airtable': [
        { id: 'create_record', label: 'Create Record', description: 'Create a new record in a table' },
        { id: 'update_record', label: 'Update Record', description: 'Update an existing record' },
        { id: 'find_record', label: 'Find Record', description: 'Find a record by field value' },
        { id: 'delete_record', label: 'Delete Record', description: 'Delete a record from a table' },
        { id: 'list_records', label: 'List Records', description: 'List all records in a table' },
        { id: 'upsert_record', label: 'Upsert Record', description: 'Create or update a record' },
    ],
    'Notion': [
        { id: 'create_database_item', label: 'Create Database Item', description: 'Add a new item to a Notion database with custom field values and optional content' },
        { id: 'update_database_item', label: 'Update Database Item', description: 'Update specific fields in a Notion database item' },
        { id: 'find_database_item', label: 'Find Database Item', description: 'Searches for an item in database by field' },
        { id: 'create_page', label: 'Create Page', description: 'Create a new Notion page as a sub-page with custom title and content' },
        { id: 'append_to_page', label: 'Append to Page', description: 'Appends content to the end of a page' },
        { id: 'get_page', label: 'Get Page', description: 'Retrieve page content and properties' },
    ],
    'Webhooks': [
        { id: 'send_webhook', label: 'Send Webhook', description: 'Send data to an external webhook URL' },
        { id: 'return_response', label: 'Return Response', description: 'Return a custom response to the webhook caller' },
    ],
    'HTTP Request': [
        { id: 'get_request', label: 'GET Request', description: 'Make a GET request to an API' },
        { id: 'post_request', label: 'POST Request', description: 'Make a POST request with data' },
        { id: 'put_request', label: 'PUT Request', description: 'Make a PUT request to update data' },
        { id: 'delete_request', label: 'DELETE Request', description: 'Make a DELETE request' },
        { id: 'patch_request', label: 'PATCH Request', description: 'Make a PATCH request for partial updates' },
    ],
    'OpenAI': [
        { id: 'ask_chatgpt', label: 'Ask ChatGPT', description: 'Ask ChatGPT anything you want!' },
        { id: 'ask_assistant', label: 'Ask Assistant', description: 'Ask a GPT assistant anything you want!' },
        { id: 'generate_image', label: 'Generate Image', description: 'Generate an image using DALL-E models' },
        { id: 'vision_prompt', label: 'Vision Prompt', description: 'Ask GPT a question about an image' },
        { id: 'text_to_speech', label: 'Text-to-Speech', description: 'Generate an audio recording from text' },
        { id: 'transcribe_audio', label: 'Transcribe Audio', description: 'Convert audio to text using Whisper' },
        { id: 'create_embedding', label: 'Create Embedding', description: 'Create text embeddings for semantic search' },
    ],
    'Gemini': [
        { id: 'generate_text', label: 'Generate Text', description: 'Generate text with Gemini models' },
        { id: 'generate_with_vision', label: 'Generate with Vision', description: 'Analyze images and generate text' },
        { id: 'chat_completion', label: 'Chat Completion', description: 'Multi-turn conversation with Gemini' },
        { id: 'analyze_document', label: 'Analyze Document', description: 'Extract information from documents' },
    ],
    'Claude': [
        { id: 'send_message', label: 'Send Message', description: 'Send a message to Claude' },
        { id: 'analyze_document', label: 'Analyze Document', description: 'Analyze and extract data from documents' },
        { id: 'summarize_text', label: 'Summarize Text', description: 'Summarize long text content' },
        { id: 'code_generation', label: 'Generate Code', description: 'Generate code based on instructions' },
        { id: 'vision_analysis', label: 'Vision Analysis', description: 'Analyze images with Claude Vision' },
    ],
    'Twilio': [
        { id: 'send_sms', label: 'Send SMS', description: 'Send an SMS message using Twilio' },
    ],
}

export const triggerCategories: IntegrationCategory[] = [
    {
        name: 'Common Triggers',
        nodes: [
            { type: 'trigger', label: 'Webhook', description: 'Trigger after a call ends' },
        ],
    },
    {
        name: 'Integrations',
        nodes: [
            { type: 'trigger', label: 'HubSpot', description: 'Trigger from HubSpot events' },
            { type: 'trigger', label: 'GoHighLevel', description: 'Trigger from GoHighLevel events' },
        ],
    },
];

export const actionCategories: IntegrationCategory[] = [
    {
        name: 'Logic',
        nodes: [
            { type: 'router', label: 'Router', description: 'Route workflow to multiple branches' },
            { type: 'wait', label: 'Wait', description: 'Pause workflow for a specific duration' },
        ],
    },
    {
        name: 'CRM',
        nodes: [
            { type: 'action', label: 'HubSpot', description: 'Sync contacts and deals' },
            { type: 'action', label: 'GoHighLevel', description: 'Sync contacts and automations' },
        ],
    },
    {
        name: 'Communication',
        nodes: [
            { type: 'action', label: 'Twilio', description: 'Send SMS messages' },
            { type: 'call_lead', label: 'Call Lead', description: 'Initiate AI outbound call' },
        ],
    },
    {
        name: 'Connections',
        nodes: [
            { type: 'action', label: 'HTTP Request', description: 'Make API calls' },
        ],
    },
];

// For backward compatibility and general use, we can still have nodeCategories
export const nodeCategories = [...triggerCategories, ...actionCategories];

export const getIntegrationIcon = (label: string, size: number = 24): React.ReactNode => {
    switch (label) {
        case 'GoHighLevel': return <GoHighLevelIcon size={size} />;
        case 'HubSpot': return <HubSpotIcon size={size} />;
        case 'Shopify': return <ShopifyIcon size={size} />;
        case 'Slack': return <SlackIcon size={size} />;
        case 'Gmail': return <GmailIcon size={size} />;
        case 'Klaviyo': return <KlaviyoIcon size={size} />;
        case 'Google Sheets': return <GoogleSheetsIcon size={size} />;
        case 'Airtable': return <AirtableIcon size={size} />;
        case 'Notion': return <NotionIcon size={size} />;
        case 'Webhooks': return <WebhookIcon size={size} />;
        case 'HTTP Request': return <HttpIcon size={size} />;
        case 'OpenAI': return <OpenAIIcon size={size} />;
        case 'Gemini': return <GeminiIcon size={size} />;
        case 'Claude': return <ClaudeIcon size={size} />;
        case 'Twilio': return <TwilioIcon size={size} />;
        case 'Telnyx': return <TelnyxIcon size={size} />;
        case 'WhatsApp': return <WhatsAppIcon size={size} />;
        case 'Cal.com': return <CalcomIcon size={size} />;
        case 'Condition': return <ConditionIcon size={size} />;
        case 'Router': return <ConditionIcon size={size} />; // Use condition icon for router
        case 'Facebook':
        case 'Facebook Leads': return <FacebookIcon size={size} />;
        case 'Webhook': return <WebhookIcon size={size} />;
        case 'Wait': return <Clock size={size} weight="duotone" className="text-amber-500" />;
        case 'Schedule': return <Clock size={size} weight="duotone" className="text-purple-500" />;
        case 'Manual': return <Plus size={size} weight="bold" className="text-purple-500" />;
        default: return null;
    }
};

