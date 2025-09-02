// import React, { useMemo, useState, useEffect } from "react";
// import { Button } from "@/components/ui/button";
// import {
//   Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
// } from "@/components/ui/table";
// import { ThemeCard } from "@/components/theme/ThemeCard";
// import { ThemeContainer } from "@/components/theme/ThemeContainer";
// import { ThemeSection } from "@/components/theme/ThemeSection";
// import { Input } from "@/components/ui/input";
// import { useToast } from "@/components/ui/use-toast";
// import { PageHeading, PageSubtext } from "@/components/ui/typography";
// import { ReloadIcon } from "@radix-ui/react-icons";
// import {
//   Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
// } from "@/components/ui/select";
// import { Checkbox } from "@/components/ui/checkbox";
// import { supabase } from "@/integrations/supabase/client";

// type UnusedTwilioNumber = {
//   sid: string;
//   phoneNumber: string;
//   friendlyName?: string;
//   usage?: "unused" | "demo" | "ours" | "foreign" | "app" | "trunk";
// };

// type PhoneNumberRow = {
//   id: string;            // PN sid
//   number: string;        // E.164
//   label?: string;
//   usage?: string;
// };

// type AssistantOpt = { id: string; name: string };
// type TrunkOpt = { sid: string; name: string | null; domainName: string | null };

// export function PhoneNumbersTab() {
//   const [loading, setLoading] = useState(false);
//   const [numbers, setNumbers] = useState<PhoneNumberRow[]>([]);
//   const [assistants, setAssistants] = useState<AssistantOpt[]>([]);
//   const [trunks, setTrunks] = useState<TrunkOpt[]>([]);
//   const [selectedTrunk, setSelectedTrunk] = useState<string>("");
//   const [selection, setSelection] = useState<Record<string, string>>({}); // PN sid -> assistantId
//   const [query, setQuery] = useState("");
//   const [replaceCatchAll, setReplaceCatchAll] = useState<boolean>(false);
//   const [forceReplace, setForceReplace] = useState<boolean>(false);
//   const { toast } = useToast();

//   const base = (import.meta.env.VITE_BACKEND_URL as string) ?? "http://localhost:4000";
//   const agentName = (import.meta.env.VITE_LK_AGENT_NAME as string) ?? "ai";

//   useEffect(() => {
//     (async () => {
//       // assistants for current user
//       const { data: auth } = await supabase.auth.getUser();
//       const uid = auth?.user?.id;
//       if (uid) {
//         const { data } = await supabase
//           .from("assistant")
//           .select("id, name")
//           .eq("user_id", uid);
//         setAssistants((data || []).map((a: any) => ({ id: a.id, name: a.name ?? "Untitled" })));
//       }
//       // Twilio trunks (for attaching DID)
//       try {
//         const r = await fetch(`${base}/api/v1/twilio/trunks`);
//         const j = await r.json();
//         if (j.success) {
//           setTrunks(j.trunks || []);
//           if ((j.trunks || []).length && !selectedTrunk) setSelectedTrunk(j.trunks[0].sid);
//         }
//         loadUnusedFromTwilio()
//       } catch {
//         // ignore – UI still works for LK rule creation
//       }
//     })();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, []);

//   async function loadUnusedFromTwilio() {
//     try {
//       setLoading(true);
//       const url = `${base}/api/v1/twilio/phone-numbers?unused=1&strict=1`;
//       const res = await fetch(url);
//       const json = await res.json();
//       if (!json.success) throw new Error(json.message || "Failed to fetch Twilio numbers");

//       const mapped: PhoneNumberRow[] =
//         ((json.numbers as UnusedTwilioNumber[] | undefined) || []).map((n) => ({
//           id: n.sid,
//           number: n.phoneNumber,
//           label: n.friendlyName || undefined,
//           usage: n.usage || "unused",
//         }));

//       setNumbers(mapped);
//       toast({ title: "Loaded", description: `Found ${mapped.length} unused number(s).` });
//     } catch (e: any) {
//       toast({ title: "Error", description: e?.message || "Could not load numbers", variant: "destructive" });
//     } finally {
//       setLoading(false);
//     }
//   }

//   async function handleAssign(row: PhoneNumberRow) {
//     const assistantId = selection[row.id];
//     if (!assistantId) {
//       toast({ title: "Pick an assistant", description: "Select an assistant before assigning.", variant: "destructive" });
//       return;
//     }
//     if (!selectedTrunk) {
//       toast({ title: "Pick a trunk", description: "Select a trunk before assigning.", variant: "destructive" });
//       return;
//     }

//     const assistantName = assistants.find((a) => a.id === assistantId)?.name || "Assistant";

//     try {
//       setLoading(true);

//       // Step 1: attach PN to the selected Twilio trunk (Elastic SIP Trunking)
//       const attachResp = await fetch(`${base}/api/v1/twilio/trunk/attach`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ phoneSid: row.id, trunkSid: selectedTrunk }),
//       });
//       const attachJson = await attachResp.json();
//       if (!attachResp.ok || !attachJson.success) {
//         throw new Error(attachJson.message || "Failed to attach number to Twilio trunk");
//       }

//       // Step 2: create LK Dispatch Rule (send ONLY assistantId + options)
//       const lkResp = await fetch(`${base}/api/v1/livekit/auto-assign`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           phoneNumber: row.number,
//           agentName,
//           assistantId,
//           replaceCatchAll,
//           forceReplace,
//           // If your server resolves LK trunk from env, no need to send trunkId/trunkName here.
//           // roomPrefix: "did-",
//         }),
//       });
//       const lkJson = await lkResp.json();
//       if (!lkResp.ok || !lkJson.success) {
//         throw new Error(lkJson.message || "Failed to create LiveKit dispatch rule");
//       }

//       const note: string | undefined = lkJson?.debug?.note;
//       toast({
//         title: "Assigned",
//         description: `${row.number} → ${assistantName}. ${note ? `(${note})` : "Calls to this DID will now dispatch your agent."}`,
//       });

//       // remove from "unused" list
//       setNumbers((prev) => prev.filter((n) => n.id !== row.id));
//     } catch (e: any) {
//       toast({ title: "Failed to assign", description: e?.message || "Please try again.", variant: "destructive" });
//     } finally {
//       setLoading(false);
//     }
//   }

//   const filtered = useMemo(() => {
//     if (!query.trim()) return numbers;
//     const q = query.toLowerCase();
//     return numbers.filter(
//       (n) => (n.number || "").toLowerCase().includes(q) || (n.label || "").toLowerCase().includes(q),
//     );
//   }, [numbers, query]);

//   return (
//     <ThemeContainer variant="base">
//       <ThemeSection>
//         <ThemeCard variant="default" className="p-6 space-y-6">
//           <div className="flex items-start justify-between gap-4">
//             <div>
//               <PageHeading>Phone Numbers</PageHeading>
//               <PageSubtext>
//                 Attach unused Twilio numbers to a SIP trunk and auto-create a LiveKit dispatch rule to your agent.
//               </PageSubtext>
//             </div>
//             <div className="flex items-center gap-3">
//               {/* <Select value={selectedTrunk} onValueChange={setSelectedTrunk}>
//                 <SelectTrigger className="w-[260px]">
//                   <SelectValue placeholder="Select Twilio trunk" />
//                 </SelectTrigger>
//                 <SelectContent>
//                   {trunks.map((t) => (
//                     <SelectItem key={t.sid} value={t.sid}>
//                       {t.name || t.sid}
//                     </SelectItem>
//                   ))}
//                 </SelectContent>
//               </Select> */}

//               <Button onClick={loadUnusedFromTwilio} disabled={loading}>
//                 {loading ? (
//                   <span className="inline-flex items-center gap-2">
//                     <ReloadIcon className="h-4 w-4 animate-spin" /> Loading
//                   </span>
//                 ) : (
//                   "Load from Twilio"
//                 )}
//               </Button>
//             </div>
//           </div>

//           <div className="flex items-center gap-3">
//             <Input
//               placeholder="Search numbers or labels..."
//               value={query}
//               onChange={(e) => setQuery(e.target.value)}
//               className="max-w-md"
//             />
//           </div>

//           <div className="border rounded-md overflow-hidden">
//             <Table>
//               <TableHeader>
//                 <TableRow>
//                   <TableHead className="w-[220px]">Number</TableHead>
//                   <TableHead>Label</TableHead>
//                   <TableHead className="w-[240px]">Assistant</TableHead>
//                   <TableHead className="w-[140px]">Action</TableHead>
//                 </TableRow>
//               </TableHeader>
//               <TableBody>
//                 {filtered.length === 0 ? (
//                   <TableRow>
//                     <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
//                       {loading ? "Loading unused numbers..." : "No unused numbers loaded. Click 'Load from Twilio'."}
//                     </TableCell>
//                   </TableRow>
//                 ) : (
//                   filtered.map((n) => (
//                     <TableRow key={n.id} className="border-b border-border/40 hover:bg-muted/30 transition-colors">
//                       <TableCell className="font-medium text-foreground">{n.number}</TableCell>
//                       <TableCell className="text-muted-foreground">{n.label || "—"}</TableCell>
//                       <TableCell>
//                         <Select
//                           value={selection[n.id] || ""}
//                           onValueChange={(v) => setSelection((prev) => ({ ...prev, [n.id]: v }))}
//                         >
//                           <SelectTrigger>
//                             <SelectValue placeholder="Select assistant" />
//                           </SelectTrigger>
//                           <SelectContent>
//                             {assistants.map((a) => (
//                               <SelectItem key={a.id} value={a.id}>
//                                 {a.name}
//                               </SelectItem>
//                             ))}
//                           </SelectContent>
//                         </Select>
//                       </TableCell>
//                       <TableCell>
//                         <Button size="sm" onClick={() => handleAssign(n)} disabled={loading || !selection[n.id]}>
//                           Assign
//                         </Button>
//                       </TableCell>
//                     </TableRow>
//                   ))
//                 )}
//               </TableBody>
//             </Table>
//           </div>
//         </ThemeCard>
//       </ThemeSection>
//     </ThemeContainer>
//   );
// }



import React, { useMemo, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ThemeCard } from "@/components/theme/ThemeCard";
import { ThemeContainer } from "@/components/theme/ThemeContainer";
import { ThemeSection } from "@/components/theme/ThemeSection";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { PageHeading, PageSubtext } from "@/components/ui/typography";
import { ReloadIcon } from "@radix-ui/react-icons";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
// import { Checkbox } from "@/components/ui/checkbox"; // removed (unused)
import { useCurrentUser } from "@/hooks/useAuthService";
import { supabase } from "@/integrations/supabase/client";

type UnusedTwilioNumber = {
  sid: string;
  phoneNumber: string;
  friendlyName?: string;
  usage?: "unused" | "demo" | "ours" | "foreign" | "app" | "trunk";
};

type PhoneNumberRow = {
  id: string;            // PN sid
  number: string;        // E.164
  label?: string;
  usage?: string;
  mapped?: boolean;      // Whether this number is mapped in our DB
  trunkSid?: string;     // Twilio trunk SID if attached
  voiceUrl?: string;     // Voice URL configuration
};

type AssistantOpt = { id: string; name: string };
type TrunkOpt = { sid: string; name: string | null; domainName: string | null };

export function PhoneNumbersTab() {
  const [loading, setLoading] = useState(false);
  const [numbers, setNumbers] = useState<PhoneNumberRow[]>([]);
  const [assistants, setAssistants] = useState<AssistantOpt[]>([]);
  const [trunks, setTrunks] = useState<TrunkOpt[]>([]);
  const [selectedTrunk, setSelectedTrunk] = useState<string>("");
  const [selection, setSelection] = useState<Record<string, string>>({}); // PN sid -> assistantId
  const [query, setQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "unused" | "used" | "assigned">("unused");
  const [hasTwilioCredentials, setHasTwilioCredentials] = useState<boolean | null>(null);
  const { toast } = useToast();
  const user = useCurrentUser();

  const base = (import.meta.env.VITE_BACKEND_URL as string) ?? "http://localhost:4000";
  const agentName = (import.meta.env.VITE_LK_AGENT_NAME as string) ?? "ai";

  useEffect(() => {
    (async () => {
      // assistants for current user
      if (user?.id) {
        const { data } = await supabase
          .from("assistant")
          .select("id, name")
          .eq("user_id", user.id);
        setAssistants((data || []).map((a: any) => ({ id: a.id, name: a.name ?? "Untitled" })));
      }
      // Twilio trunks (for attaching DID)
      try {
        const r = await fetch(`${base}/api/v1/twilio/trunks`);
        const j = await r.json();
        if (j.success) {
          setTrunks(j.trunks || []);
          if ((j.trunks || []).length && !selectedTrunk) setSelectedTrunk(j.trunks[0].sid);
        }
      } catch {
        // ignore – UI still works for LK rule creation
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Check Twilio credentials status and load numbers
  useEffect(() => {
    if (user?.id) {
      loadAllNumbersFromTwilio();
    }
  }, [user?.id]);

  async function loadAllNumbersFromTwilio() {
    try {
      setLoading(true);

      // First try user-specific endpoint
      const url = `${base}/api/v1/twilio/user/phone-numbers`;
      const res = await fetch(url, {
        headers: {
          'x-user-id': user?.id || '',
        },
      });
      const json = await res.json();

      if (!json.success) {
        if (res.status === 404 && json.message === 'No Twilio credentials found') {
          setHasTwilioCredentials(false);
          setNumbers([]);
          return;
        }

        // If user endpoint fails, try fallback to admin endpoint
        console.log('User endpoint failed, trying admin endpoint:', json.message);
        return loadFromAdminEndpoint();
      }

      setHasTwilioCredentials(true);
      const mapped: PhoneNumberRow[] =
        ((json.numbers as any[] | undefined) || []).map((n) => ({
          id: n.sid,
          number: n.phoneNumber,
          label: n.friendlyName || undefined,
          usage: n.usage || "unused",
          mapped: n.mapped || false,
          trunkSid: n.trunkSid || undefined,
          voiceUrl: n.voiceUrl || undefined,
        }));

      setNumbers(mapped);
      const unusedCount = mapped.filter(n => n.usage === "unused" && !n.mapped).length;
      const usedCount = mapped.length - unusedCount;
      toast({
        title: "Loaded",
        description: `Found ${mapped.length} total numbers (${unusedCount} unused, ${usedCount} used).`
      });
    } catch (e: any) {
      console.error("Error loading phone numbers:", e);
      // Try fallback to admin endpoint
      return loadFromAdminEndpoint();
    } finally {
      setLoading(false);
    }
  }

  async function loadFromAdminEndpoint() {
    try {
      console.log('Loading from admin endpoint as fallback');
      const url = `${base}/api/v1/twilio/phone-numbers`;
      const res = await fetch(url);
      const json = await res.json();

      if (!json.success) {
        throw new Error(json.message || "Failed to fetch Twilio numbers");
      }

      setHasTwilioCredentials(true); // Assume credentials exist if admin endpoint works
      const mapped: PhoneNumberRow[] =
        ((json.numbers as any[] | undefined) || []).map((n) => ({
          id: n.sid,
          number: n.phoneNumber,
          label: n.friendlyName || undefined,
          usage: n.usage || "unused",
          mapped: n.mapped || false,
          trunkSid: n.trunkSid || undefined,
          voiceUrl: n.voiceUrl || undefined,
        }));

      setNumbers(mapped);
      const unusedCount = mapped.filter(n => n.usage === "unused" && !n.mapped).length;
      const usedCount = mapped.length - unusedCount;
      toast({
        title: "Loaded (Admin)",
        description: `Found ${mapped.length} total numbers (${unusedCount} unused, ${usedCount} used).`
      });
    } catch (e: any) {
      console.error("Error loading from admin endpoint:", e);
      setHasTwilioCredentials(false);
      setNumbers([]);
      toast({ title: "Error", description: e?.message || "Could not load numbers", variant: "destructive" });
    }
  }

  async function handleAssign(row: PhoneNumberRow) {
    const assistantId = selection[row.id];
    if (!assistantId) {
      toast({ title: "Pick an assistant", description: "Select an assistant before assigning.", variant: "destructive" });
      return;
    }
    if (!selectedTrunk) {
      toast({ title: "Pick a trunk", description: "Select a trunk before assigning.", variant: "destructive" });
      return;
    }

    const assistantName = assistants.find((a) => a.id === assistantId)?.name || "Assistant";

    try {
      setLoading(true);

      // Step 1: attach PN to the user's Twilio trunk
      const attachResp = await fetch(`${base}/api/v1/twilio/user/trunk/attach`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          'x-user-id': user?.id || '',
        },
        body: JSON.stringify({ phoneSid: row.id }),
      });
      const attachJson = await attachResp.json();
      if (!attachResp.ok || !attachJson.success) {
        throw new Error(attachJson.message || "Failed to attach number to Twilio trunk");
      }

      // Step 2: Create dedicated LiveKit trunk for this assistant
      try {
        const livekitResp = await fetch(`${base}/api/v1/livekit/assistant-trunk`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            assistantId,
            assistantName,
            phoneNumber: row.number,
          }),
        });
        const livekitJson = await livekitResp.json();
        if (!livekitResp.ok || !livekitJson.success) {
          console.warn('LiveKit integration failed:', livekitJson.message);
          // Don't fail the entire operation if LiveKit fails
        } else {
          console.log('LiveKit trunk created:', livekitJson.trunk);
        }
      } catch (livekitError) {
        console.warn('LiveKit integration error:', livekitError);
        // Don't fail the entire operation if LiveKit fails
      }

      toast({
        title: "Assigned",
        description: `${row.number} → ${assistantName}. Created dedicated LiveKit trunk.`,
      });

      // remove from "unused" list
      setNumbers((prev) => prev.filter((n) => n.id !== row.id));
    } catch (e: any) {
      toast({ title: "Failed to assign", description: e?.message || "Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    let filteredNumbers = numbers;

    // Apply filter type
    if (filterType === "unused") {
      filteredNumbers = numbers.filter(n => {
        const isDemoUrl = n.voiceUrl?.includes('demo.twilio.com');
        const isDemoUsage = n.usage === "demo";
        const hasTrunk = n.trunkSid && n.trunkSid !== null;
        const isUnused = !hasTrunk && ((n.usage === "unused" && !n.mapped) || (isDemoUrl && isDemoUsage));
        return isUnused;
      });
    } else if (filterType === "used") {
      filteredNumbers = numbers.filter(n => {
        const isDemoUrl = n.voiceUrl?.includes('demo.twilio.com');
        const isDemoUsage = n.usage === "demo";
        const hasTrunk = n.trunkSid && n.trunkSid !== null;
        const isAssigned = hasTrunk;
        const isUnused = !hasTrunk && ((n.usage === "unused" && !n.mapped) || (isDemoUrl && isDemoUsage));
        const isUsed = !isUnused && !isAssigned;
        return isUsed;
      });
    } else if (filterType === "assigned") {
      filteredNumbers = numbers.filter(n => {
        const hasTrunk = n.trunkSid && n.trunkSid !== null;
        return hasTrunk;
      });
    }

    // Apply search query
    if (query.trim()) {
      const q = query.toLowerCase();
      filteredNumbers = filteredNumbers.filter(
        (n) =>
          (n.number || "").toLowerCase().includes(q) ||
          (n.label || "").toLowerCase().includes(q) ||
          (n.voiceUrl || "").toLowerCase().includes(q),
      );
    }

    return filteredNumbers;
  }, [numbers, query, filterType]);

  return (
    <ThemeContainer variant="base">
      <ThemeSection>
        <ThemeCard variant="default" className="p-6 space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <PageHeading>Phone Numbers</PageHeading>
              <PageSubtext>
                View and manage all your Twilio phone numbers. Assign unused numbers to assistants or view currently used numbers.
              </PageSubtext>
            </div>
            <div className="flex items-center gap-3">
              {/* Uncomment to allow manual trunk selection
              <Select value={selectedTrunk} onValueChange={setSelectedTrunk}>
                <SelectTrigger className="w-[260px]">
                  <SelectValue placeholder="Select Twilio trunk" />
                </SelectTrigger>
                <SelectContent>
                  {trunks.map((t) => (
                    <SelectItem key={t.sid} value={t.sid}>
                      {t.name || t.sid}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              */}
              <Button
                onClick={loadAllNumbersFromTwilio}
                disabled={loading || hasTwilioCredentials === false}
                title={hasTwilioCredentials === false ? "Configure Twilio credentials in Settings first" : ""}
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <ReloadIcon className="h-4 w-4 animate-spin" /> Loading
                  </span>
                ) : (
                  "Load from Twilio"
                )}
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Input
              placeholder="Search numbers, labels, or URLs..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="max-w-md"
            />
            <Select value={filterType} onValueChange={(value: "all" | "unused" | "used" | "assigned") => setFilterType(value)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Numbers</SelectItem>
                <SelectItem value="unused">Unused Only</SelectItem>
                <SelectItem value="used">Used Only</SelectItem>
                <SelectItem value="assigned">Assigned Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Number</TableHead>
                  <TableHead>Label</TableHead>
                  <TableHead className="w-[200px]">Voice URL</TableHead>
                  <TableHead className="w-[120px]">Status</TableHead>
                  <TableHead className="w-[200px]">Assistant</TableHead>
                  <TableHead className="w-[120px]">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      {loading ? (
                        "Loading numbers..."
                      ) : hasTwilioCredentials === false ? (
                        <div className="space-y-2">
                          <p>No Twilio credentials configured.</p>
                          <p className="text-sm">Please configure your Twilio credentials in <strong>Settings → Workspace → Integrations</strong> to manage phone numbers.</p>
                        </div>
                      ) : (
                        "No numbers loaded. Click 'Load from Twilio'."
                      )}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((n) => {
                    const isDemoUrl = n.voiceUrl?.includes('demo.twilio.com');
                    const isDemoUsage = n.usage === "demo";
                    const hasTrunk = n.trunkSid && n.trunkSid !== null;

                    // Priority: If has trunk, it's assigned regardless of URL
                    const isAssigned = hasTrunk;
                    const isUnused = !hasTrunk && ((n.usage === "unused" && !n.mapped) || (isDemoUrl && isDemoUsage));
                    const isUsed = !isUnused && !isAssigned;

                    return (
                      <TableRow
                        key={n.id}
                        className={`border-b border-border/40 hover:bg-muted/30 transition-colors ${isAssigned ? "bg-green-50 dark:bg-green-950/20" : isUsed ? "bg-muted/20" : ""
                          }`}
                      >
                        <TableCell className="font-medium text-foreground">{n.number}</TableCell>
                        <TableCell className="text-muted-foreground">{n.label || "—"}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {n.voiceUrl ? (
                            <div className="max-w-[180px] truncate" title={n.voiceUrl}>
                              {n.voiceUrl}
                            </div>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${isAssigned
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                              : isDemoUrl || isDemoUsage
                                ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                                : isUnused
                                  ? "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
                                  : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                            }`}>
                            {isAssigned ? "Assigned" : isDemoUrl || isDemoUsage ? "Demo (Unused)" : isUnused ? "Unused" : "Used"}
                          </span>
                        </TableCell>
                        <TableCell>
                          {isUnused ? (
                            <Select
                              value={selection[n.id] || ""}
                              onValueChange={(v) => setSelection((prev) => ({ ...prev, [n.id]: v }))}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select assistant" />
                              </SelectTrigger>
                              <SelectContent>
                                {assistants.map((a) => (
                                  <SelectItem key={a.id} value={a.id}>
                                    {a.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : isAssigned ? (
                            <span className="text-green-600 dark:text-green-400 text-sm font-medium">Assigned to trunk</span>
                          ) : (
                            <span className="text-muted-foreground text-sm">Already assigned</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {isUnused ? (
                            <Button size="sm" onClick={() => handleAssign(n)} disabled={loading || !selection[n.id]}>
                              Assign
                            </Button>
                          ) : isAssigned ? (
                            <span className="text-green-600 dark:text-green-400 text-sm">✓</span>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </ThemeCard>
      </ThemeSection>
    </ThemeContainer>
  );
}
