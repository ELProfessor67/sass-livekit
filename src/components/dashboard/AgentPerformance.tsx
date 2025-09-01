
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";

interface AgentData {
  id: number;
  name: string;
  avatar: string | null;
  calls: number;
  resolution: number;
  satisfaction: number;
  available: boolean;
}

const agents: AgentData[] = [
  {
    id: 1,
    name: "Alex Morgan",
    avatar: null,
    calls: 32,
    resolution: 94,
    satisfaction: 98,
    available: true,
  },
  {
    id: 2,
    name: "Sam Wilson",
    avatar: null,
    calls: 28,
    resolution: 92,
    satisfaction: 95,
    available: true,
  },
  {
    id: 3,
    name: "Taylor Swift",
    avatar: null,
    calls: 25,
    resolution: 89,
    satisfaction: 92,
    available: false,
  },
  {
    id: 4,
    name: "Jordan Lee",
    avatar: null,
    calls: 22,
    resolution: 86,
    satisfaction: 90,
    available: true,
  },
  {
    id: 5,
    name: "Casey Jones",
    avatar: null,
    calls: 18,
    resolution: 82,
    satisfaction: 88,
    available: false,
  },
];

export default function AgentPerformance() {
  return (
    <Card variant="glass" className="liquid-glass-light liquid-rounded-sm overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-3 text-lg font-extralight tracking-tight">
          <div className="w-1 h-6 bg-gradient-to-b from-primary to-primary/60 rounded-sm
                        shadow-[0_0_12px_rgba(255,74,113,0.4)]"></div>
          <span className="text-liquid">Agent Performance</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {agents.map((agent) => (
          <div key={agent.id}>
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Avatar className="h-8 w-8">
                  {agent.avatar ? (
                    <AvatarImage src={agent.avatar} />
                  ) : (
                    <AvatarFallback>
                      {agent.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div>
                  <h3 className="font-medium">{agent.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {agent.calls} calls today
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div
                  className={`h-2 w-2 rounded-full ${
                    agent.available ? "bg-green-500" : "bg-gray-300"
                  }`}
                ></div>
                <span className="text-xs text-muted-foreground">
                  {agent.available ? "Available" : "Unavailable"}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-muted-foreground">Resolution Rate</span>
                  <span className="font-medium">{agent.resolution}%</span>
                </div>
                <Progress value={agent.resolution} className="h-1" />
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-muted-foreground">Satisfaction</span>
                  <span className="font-medium">{agent.satisfaction}%</span>
                </div>
                <Progress value={agent.satisfaction} className="h-1" />
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
