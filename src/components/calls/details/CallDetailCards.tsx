
import { Clock, HomeIcon, MapPin, Phone, User } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { SubHeading, SecondaryText } from "@/components/ui/typography";
import { Call } from "@/components/calls/types";
import { ThemeCard } from "@/components/theme";

interface CallDetailCardsProps {
  callData: Call;
}

export function CallDetailCards({ callData }: CallDetailCardsProps) {
  const details = [
    {
      title: "Caller Information",
      items: [
        {
          icon: <User className="h-3.5 w-3.5" />,
          label: callData.name,
          subtitle: "Caller"
        },
        {
          icon: <Phone className="h-3.5 w-3.5" />,
          label: callData.phoneNumber,
          subtitle: "Phone Number"
        },
        {
          icon: <MapPin className="h-3.5 w-3.5" />,
          label: callData.address || "Not provided",
          subtitle: "Address"
        },
        {
          icon: <HomeIcon className="h-3.5 w-3.5" />,
          label: callData.analysis?.property_type || "Other",
          subtitle: "Property Type"
        }
      ]
    },
    {
      title: "Date & Time",
      items: [
        {
          icon: <Clock className="h-3.5 w-3.5" />,
          label: callData.date,
          subtitle: callData.time
        }
      ]
    },
    {
      title: "Call Details",
      items: [
        {
          icon: <Phone className="h-3.5 w-3.5" />,
          label: "Phone",
          subtitle: callData.direction
        },
        {
          icon: <Clock className="h-3.5 w-3.5" />,
          label: callData.duration || "0s",
          subtitle: ""
        }
      ]
    }
  ];

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {details.map((section, index) => (
        <Card 
          key={index} 
          className="backdrop-blur-xl bg-white/[0.02] border border-white/[0.08] rounded-2xl overflow-hidden"
        >
          <CardContent className="p-6">
            <h3 className="mb-4 text-base font-medium tracking-tight text-foreground">
              {section.title}
            </h3>
            <div className="space-y-4">
              {section.items.map((item, itemIndex) => (
                <div key={itemIndex} className="flex items-start gap-3">
                  <div className="mt-0.5 text-muted-foreground">
                    {item.icon}
                  </div>
                  <div>
                    <div className="font-medium text-sm tracking-tight text-foreground">
                      {item.label}
                    </div>
                    {item.subtitle && (
                      <div className="text-xs text-muted-foreground">
                        {item.subtitle}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
