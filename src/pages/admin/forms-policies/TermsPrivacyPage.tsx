import { useState, useEffect } from 'react';
import { FormsPoliciesLayout } from '@/components/forms-policies/FormsPoliciesLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function TermsPrivacyPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Terms & Privacy Policies</h1>
        <p className="text-muted-foreground mt-1">
          Manage Terms of Service and Privacy Policy documents for both clients and lawyers with version control and publishing workflow.
        </p>
      </div>

      <Tabs defaultValue="client" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="client">Client Policies</TabsTrigger>
          <TabsTrigger value="lawyer">Lawyer Policies</TabsTrigger>
        </TabsList>
        
        <TabsContent value="client" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Client Terms & Privacy</CardTitle>
              <CardDescription>
                Manage client-facing Terms of Service and Privacy Policy documents
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormsPoliciesLayout
                type="client_policies"
                title=""
                description=""
              />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="lawyer" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Lawyer Terms & Privacy</CardTitle>
              <CardDescription>
                Manage lawyer-specific Terms of Service and Privacy Policy documents
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormsPoliciesLayout
                type="lawyer_policies"
                title=""
                description=""
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}