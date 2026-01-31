// server/tests/verify-http-node.js
import 'dotenv/config';
import { workflowService } from '../services/workflow-service.js';

async function verify() {
    console.log('--- HTTP Node Logic Verification ---');

    console.log('1. Testing handleHttpRequestNode directly...');

    // Mock node with interpolation
    const mockNode = {
        id: 'test_node_1',
        type: 'action',
        data: {
            integration: 'HTTP Request',
            url: 'https://httpbin.org/post?query={event}',
            method: 'POST',
            headers: [
                { key: 'Content-Type', value: 'application/json' },
                { key: 'X-Test-Header', value: 'Val-{contact_name}' }
            ],
            body: '{ "msg": "Hello {contact_name}", "event": "{event}" }'
        }
    };

    // Mock context
    const mockContext = {
        event: 'test_event',
        contact_name: 'John Doe',
        phone_number: '+1234567890'
    };

    console.log('Context:', JSON.stringify(mockContext, null, 2));
    console.log('Node Data:', JSON.stringify(mockNode.data, null, 2));

    try {
        console.log('\nExecuting handleHttpRequestNode...');
        await workflowService.handleHttpRequestNode(mockNode, mockContext);
        console.log('\n✅ handleHttpRequestNode executed successfully (Check logs for Interpolated values)');
    } catch (err) {
        console.error('❌ handleHttpRequestNode failed:', err);
    }

    console.log('\n2. Testing handleHttpRequestNode with GET and Dot Notation...');

    const mockNodeGet = {
        id: 'test_node_2',
        type: 'action',
        data: {
            integration: 'HTTP Request',
            url: 'https://httpbin.org/get?name={appointment.contact.name}',
            method: 'GET',
            headers: [
                { key: 'Accept', value: 'application/json' }
            ]
        }
    };

    const mockContextGet = {
        appointment: {
            contact: {
                name: 'Alice Smith'
            }
        }
    };

    try {
        console.log('\nExecuting handleHttpRequestNode (GET)...');
        await workflowService.handleHttpRequestNode(mockNodeGet, mockContextGet);
        console.log('\n✅ handleHttpRequestNode (GET) executed successfully');
    } catch (err) {
        console.error('❌ handleHttpRequestNode (GET) failed:', err);
    }
}

verify().catch(console.error);
