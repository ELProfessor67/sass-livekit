
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { resetFirebaseInstance } from '@/lib/firebase';

export default function ApiSettings() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>("firebase");

  // Firebase config state
  const [firebaseConfig, setFirebaseConfig] = useState({
    apiKey: '',
    authDomain: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: '',
  });

  // GHL state
  const [ghlApiKey, setGhlApiKey] = useState<string>('');

  // Load saved values on component mount
  useEffect(() => {
    // Load Firebase config
    const savedFirebaseConfig = localStorage.getItem('firebase_config');
    if (savedFirebaseConfig) {
      try {
        setFirebaseConfig(JSON.parse(savedFirebaseConfig));
      } catch (e) {
        console.error("Error parsing Firebase config:", e);
      }
    }

    // Load GHL API key
    const savedGhlApiKey = localStorage.getItem('ghl_api_key');
    if (savedGhlApiKey) {
      setGhlApiKey(savedGhlApiKey);
    }
  }, []);

  // Handle Firebase config save
  const handleSaveFirebaseConfig = () => {
    // Validate required fields
    if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
      toast({
        title: "Required Fields Missing",
        description: "Firebase API Key and Project ID are required.",
        variant: "destructive"
      });
      return;
    }

    // Save to localStorage
    localStorage.setItem('firebase_config', JSON.stringify(firebaseConfig));
    
    // Reset Firebase instance to apply new config
    resetFirebaseInstance();

    toast({
      title: "Firebase Configuration Saved",
      description: "Your Firebase settings have been updated."
    });
  };

  // Handle GHL API key save
  const handleSaveGhlApiKey = () => {
    // Validate API key
    if (!ghlApiKey) {
      toast({
        title: "API Key Required",
        description: "Please enter your GoHighLevel API key.",
        variant: "destructive"
      });
      return;
    }

    // Save to localStorage
    localStorage.setItem('ghl_api_key', ghlApiKey);

    toast({
      title: "GHL API Key Saved",
      description: "Your GoHighLevel API key has been updated."
    });
  };

  // Handle Firebase config input changes
  const handleFirebaseInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFirebaseConfig(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>API Integrations</CardTitle>
        <CardDescription>
          Configure your Firebase and GoHighLevel integrations.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-2 mb-6">
            <TabsTrigger value="firebase">Firebase</TabsTrigger>
            <TabsTrigger value="ghl">GoHighLevel</TabsTrigger>
          </TabsList>
          
          <TabsContent value="firebase" className="space-y-4">
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="apiKey">API Key *</Label>
                  <Input 
                    id="apiKey"
                    name="apiKey"
                    value={firebaseConfig.apiKey}
                    onChange={handleFirebaseInputChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="authDomain">Auth Domain</Label>
                  <Input 
                    id="authDomain"
                    name="authDomain"
                    value={firebaseConfig.authDomain}
                    onChange={handleFirebaseInputChange}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="projectId">Project ID *</Label>
                  <Input 
                    id="projectId"
                    name="projectId"
                    value={firebaseConfig.projectId}
                    onChange={handleFirebaseInputChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="storageBucket">Storage Bucket</Label>
                  <Input 
                    id="storageBucket"
                    name="storageBucket"
                    value={firebaseConfig.storageBucket}
                    onChange={handleFirebaseInputChange}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="messagingSenderId">Messaging Sender ID</Label>
                  <Input 
                    id="messagingSenderId"
                    name="messagingSenderId"
                    value={firebaseConfig.messagingSenderId}
                    onChange={handleFirebaseInputChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="appId">App ID</Label>
                  <Input 
                    id="appId"
                    name="appId"
                    value={firebaseConfig.appId}
                    onChange={handleFirebaseInputChange}
                  />
                </div>
              </div>
            </div>
            
            <div className="text-sm text-muted-foreground">
              Fields marked with * are required.
            </div>
          </TabsContent>
          
          <TabsContent value="ghl" className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ghl-api-key">GoHighLevel API Key</Label>
                <Input 
                  id="ghl-api-key"
                  value={ghlApiKey}
                  onChange={(e) => setGhlApiKey(e.target.value)}
                  placeholder="Enter your GoHighLevel API key"
                />
              </div>
              
              <div className="text-sm text-muted-foreground">
                You can find your API key in your GoHighLevel account settings.
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-end">
        {activeTab === "firebase" ? (
          <Button onClick={handleSaveFirebaseConfig}>
            Save Firebase Config
          </Button>
        ) : (
          <Button onClick={handleSaveGhlApiKey}>
            Save GHL API Key
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
