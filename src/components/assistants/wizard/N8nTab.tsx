import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { N8nData, N8nWebhookField } from "./types";

interface N8nTabProps {
  data: N8nData;
  onChange: (data: Partial<N8nData>) => void;
}

export const N8nTab: React.FC<N8nTabProps> = ({ data, onChange }) => {
  const addWebhookField = () => {
    onChange({
      webhookFields: [...data.webhookFields, { name: "", description: "" }]
    });
  };

  const updateWebhookField = (index: number, field: Partial<N8nWebhookField>) => {
    const updated = [...data.webhookFields];
    updated[index] = { ...updated[index], ...field };
    onChange({ webhookFields: updated });
  };

  const removeWebhookField = (index: number) => {
    const updated = data.webhookFields.filter((_, i) => i !== index);
    onChange({ webhookFields: updated });
  };

  return (
    <div className="space-y-8">
      {/* Webhook Configuration */}
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-2">Webhook Configuration</h3>
          <p className="text-sm text-muted-foreground">
            Configure webhooks to send data to your n8n workflows. Add the webhook URL and specify what caller details to collect.
          </p>
        </div>

        {/* Webhook URL */}
        <div className="space-y-2">
          <Label htmlFor="webhook-url">Webhook URL</Label>
          <Input
            id="webhook-url"
            placeholder="https://your-n8n-instance.com/webhook/your-webhook-id"
            value={data.webhookUrl}
            onChange={(e) => onChange({ webhookUrl: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            The n8n webhook URL where data will be sent
          </p>
        </div>

        {/* Webhook Fields */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Data Fields to Collect</h4>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addWebhookField}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Field
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Specify what details to collect from callers (e.g., "name", "email", "phone", "company", "budget")
          </p>
          
          {data.webhookFields.map((field, index) => (
            <div key={index} className="space-y-3 p-4 border rounded-lg">
              <div className="flex items-center justify-between">
                <h5 className="font-medium">Field {index + 1}</h5>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeWebhookField(index)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor={`field-${index}-name`}>Field Name</Label>
                  <Input
                    id={`field-${index}-name`}
                    placeholder="customer_name"
                    value={field.name}
                    onChange={(e) => updateWebhookField(index, { name: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    The field name (e.g., "customer_name", "email", "phone")
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor={`field-${index}-description`}>Description</Label>
                  <Input
                    id={`field-${index}-description`}
                    placeholder="Customer's full name"
                    value={field.description}
                    onChange={(e) => updateWebhookField(index, { description: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    What this field represents (e.g., "Customer's full name", "Email address", "Phone number")
                  </p>
                </div>
              </div>
            </div>
          ))}
          
          {data.webhookFields.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p>No data fields configured yet.</p>
              <p className="text-sm">Click "Add Field" to specify what caller details to collect.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
