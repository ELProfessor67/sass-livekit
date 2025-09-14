import { GlassCard } from "@/components/sections/glass-card"
import { Button } from "@/components/ui/button"
import { Zap, Mic, Clock } from "lucide-react"
import {
  siSlack,
  siHubspot,
  siSalesforce,
  siGooglecalendar,
  siZapier,
  siCalendly,
  siMake
} from 'simple-icons'

const IntegrationsSection = () => {
  const integrationApps = [
    {
      name: "Slack",
      position: "top-6 left-6",
      icon: siSlack,
      color: "#E01E5A"
    },
    {
      name: "HubSpot",
      position: "top-6 right-6",
      icon: siHubspot,
      color: "#FF7A59"
    },
    {
      name: "Zapier",
      position: "right-6 top-1/2 -translate-y-1/2",
      icon: siZapier,
      color: "#FF4A00"
    },
    {
      name: "Salesforce",
      position: "bottom-6 right-6",
      icon: siSalesforce,
      color: "#00A1E0"
    },
    {
      name: "Google Calendar",
      position: "bottom-6 left-6",
      icon: siGooglecalendar,
      color: "#4285F4"
    },
    {
      name: "Cal.com",
      position: "left-6 top-1/2 -translate-y-1/2",
      icon: siCalendly,
      color: "#006BFF"
    },
    {
      name: "Make",
      position: "top-6 left-1/2 -translate-x-1/2",
      icon: siMake,
      color: "#6B46C1"
    },
    {
      name: "GoHighLevel",
      position: "bottom-6 left-1/2 -translate-x-1/2",
      icon: null,
      color: "#7C3AED"
    }
  ]

  const features = [
    {
      icon: Zap,
      title: "Smart Templates",
      description: "Pre-built conversation flows that adapt to your business needs automatically",
      gradient: "from-blue-500/20 to-purple-500/20"
    },
    {
      icon: Mic,
      title: "Auto Call Recording",
      description: "Capture every conversation with premium analytics and searchable transcripts",
      gradient: "from-green-500/20 to-blue-500/20"
    },
    {
      icon: Clock,
      title: "Scheduled Actions",
      description: "Automate follow-ups, reminders, and outreach based on conversation outcomes",
      gradient: "from-purple-500/20 to-pink-500/20"
    }
  ]

  return (
    <section className="py-16 lg:py-20 bg-gradient-to-br from-[#e9e6ff] to-[#bebbd3]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-5xl md:text-7xl font-extralight tracking-tight leading-tight mb-4">
            Automate your workflow
          </h2>
          <p className="text-base font-normal leading-relaxed text-gray-500 max-w-2xl mx-auto">
            Connect your AI voice agent to the tools you already use. Get enterprise-grade integrations
            without the complexity - designed for individuals who want professional results.
          </p>
        </div>

        {/* Central Integration Hub */}
        <div className="mb-20">
          <div className="relative mx-auto w-80 h-80 flex items-center justify-center">
            {/* Central Hub */}
            <div className="rounded-2xl border border-[#d8d9e8]/30 bg-[#d8d9e8]/10 backdrop-blur-md shadow-xl transition-all duration-300 hover:shadow-2xl hover:shadow-[#b7aaff]/5 w-32 h-32 flex items-center justify-center relative z-10 p-6">
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-2 rounded-lg bg-gradient-to-r from-[#b7aaff] to-[#b7aaff]-glow flex items-center justify-center">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <span className="text-sm font-medium">Your AI Agent</span>
              </div>
            </div>

            {/* Connection Lines */}
            <div className="absolute inset-0 z-0">
              {integrationApps.map((app, index) => (
                <div
                  key={app.name}
                  className={`absolute w-0.5 h-16 bg-gradient-to-t from-[#b7aaff]/30 to-transparent transform origin-bottom ${app.position}`}
                  style={{
                    transform: `rotate(${(index * 45) - 90}deg)`,
                  }}
                />
              ))}
            </div>

            {/* App Icons */}
            {integrationApps.map((app) => (
              <div
                key={app.name}
                className={`absolute ${app.position} transform -translate-x-1/2 -translate-y-1/2`}
              >
                <div className="rounded-2xl border border-[#d8d9e8]/30 bg-[#d8d9e8]/10 backdrop-blur-md shadow-xl transition-all duration-300 hover:shadow-2xl hover:shadow-[#b7aaff]/5 w-16 h-16 flex items-center justify-center hover:scale-110 transition-transform cursor-pointer p-0 overflow-hidden">
                  {app.icon ? (
                    <svg
                      role="img"
                      viewBox="0 0 24 24"
                      className="w-10 h-10"
                      fill={app.color}
                    >
                      <path d={app.icon.path} />
                    </svg>
                  ) : (
                    <span className="text-sm font-bold" style={{ color: app.color }}>
                      GHL
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-12 max-w-4xl mx-auto">
          {features.map((feature) => (
            <div key={feature.title} className="rounded-2xl border border-[#d8d9e8]/30 bg-[#d8d9e8]/10 backdrop-blur-md shadow-xl transition-all duration-300 hover:shadow-2xl hover:shadow-[#b7aaff]/5 text-center group hover:scale-105 transition-all duration-300 p-6">
              <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-r ${feature.gradient} flex items-center justify-center`}>
                <feature.icon className="w-8 h-8 text-indigo-500" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center">
          <Button size="lg" className="bg-gradient-to-r from-[#b7aaff] to-[#b7aaff]-glow hover:shadow-lg transition-all text-black">
            Explore All Integrations
          </Button>
        </div>
      </div>
    </section>
  )
}

export { IntegrationsSection }