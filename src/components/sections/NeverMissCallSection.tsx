import { GlassCard } from "@/components/sections/glass-card"
import { GlassButton } from "@/components/sections/glass-button"
import { Badge } from "@/components/ui/badge"
import {
  Phone,
  Clock,
  User,
  MessageSquare,
  CheckCircle,
  ArrowRight,
  FileText,
  Brain,
  Shield
} from "lucide-react"

export const NeverMissCallSection = () => {
  return (
    <section className="relative py-24 px-4 overflow-hidden">
      {/* Black to periwinkle gradient background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-slate-900 to-[hsl(238,100%,74%)]" />
        <div className="absolute inset-0 bg-gradient-to-br from-black/50 via-transparent to-[#b7aaff]/20" />
        {/* Radial overlay for depth */}
        <div className="absolute inset-0 bg-gradient-radial from-transparent via-[#b7aaff]/5 to-[#b7aaff]/10" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Centered Header Section */}
        <div className="text-center mb-16 space-y-6">
          <Badge variant="secondary" className="rounded-2xl border border-[#d8d9e8]/30 bg-[#d8d9e8]/10 backdrop-blur-md shadow-xl transition-all duration-300 px-4 py-2 bg-[#b7aaff]/10 text-indigo-500 border-[#b7aaff]/20 mx-auto">
            <Phone className="w-4 h-4 mr-2" />
            24/7 AI Coverage
          </Badge>

          <h2 className="text-3xl md:text-5xl font-light tracking-tight text-white">
            Never miss a call with
            <span className="text-indigo-500"> intelligent AI</span>
          </h2>

          <p className="text-lg md:text-xl font-light leading-relaxed text-gray-200 max-w-3xl mx-auto">
            Your AI voice agent answers every call instantly, books appointments,
            qualifies leads, and handles customer inquiries with human-like intelligence.
          </p>
        </div>

        {/* Unified Container for Benefits and Call Interface */}
        <div className="bg-[#f9fafa]/30 backdrop-blur-lg border border-[#d8d9e8]/20 shadow-lg rounded-xl text-[#f2f7fb] transition-all duration-300 hover:scale-[1.02] hover:shadow-[var(--shadow-glass-lg)] mb-20" style={{ background: 'linear-gradient(135deg, hsl(240 5% 98%/ 0.4), hsl(240 5% 98%/ 0.2))' }}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center p-8">

            {/* Left Content - Key Benefits */}
            <div>
              <div className="flex flex-col space-y-1.5 mb-6">
                <h3 className="text-2xl font-semibold leading-none tracking-tight text-white">Key Benefits</h3>
                <p className="text-sm text-gray-300">Why businesses choose our AI voice agent</p>
              </div>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 bg-[#b7aaff]/10 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-indigo-500" />
                  </div>
                  <span className="text-base font-normal leading-relaxed text-white">Instant response, zero wait time</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 bg-[#b7aaff]/10 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-indigo-500" />
                  </div>
                  <span className="text-base font-normal leading-relaxed text-white">Automatically books appointments</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 bg-[#b7aaff]/10 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-indigo-500" />
                  </div>
                  <span className="text-base font-normal leading-relaxed text-white">Qualifies leads while you sleep</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 bg-[#b7aaff]/10 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-indigo-500" />
                  </div>
                  <span className="text-base font-normal leading-relaxed text-white">Detailed call summaries & insights</span>
                </div>
              </div>

              <div className="mt-6">
                <GlassButton variant="primary" size="lg" className="group">
                  See it in action
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </GlassButton>
              </div>
            </div>

            {/* Right Side - Enhanced Call Interface Showcase */}
            <div className="relative">
              <div className="relative group max-w-lg mx-auto">
                {/* Premium glass card container with enhanced effects */}
                <div className="rounded-2xl border border-[#d8d9e8]/30 bg-[#d8d9e8]/10 backdrop-blur-md shadow-xl transition-all duration-300 hover:shadow-2xl hover:shadow-[#b7aaff]/5 p-8 rounded-3xl relative overflow-hidden">
                  {/* Subtle inner glow */}
                  <div className="absolute inset-0 bg-gradient-to-br from-[#b7aaff]/5 via-transparent to-[#b7aaff]/3 rounded-3xl" />

                  <div className="relative z-10">
                    <img
                      src="/lovable-uploads/092776e5-4c4b-4eb2-bb10-13b989c394ca.png"
                      alt="AI voice agent call interface showing successful appointment booking with real-time conversation flow"
                      className="w-full h-auto rounded-2xl transition-all duration-500 group-hover:scale-[1.03] shadow-lg"
                    />
                  </div>

                  {/* Floating UI Elements */}
                  <div className="absolute top-8 right-8 z-20">
                    <Badge className="bg-[#b7aaff]/90 text-[#0d0e11] border-[#b7aaff]/30 backdrop-blur-md shadow-xl animate-pulse">
                      <Brain className="w-3 h-3 mr-1" />
                      Live AI
                    </Badge>
                  </div>

                  {/* Status indicator */}
                  <div className="absolute bottom-8 left-8 z-20 flex items-center space-x-2">
                    <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
                    <span className="text-xs font-medium text-white/80">Call in progress</span>
                  </div>
                </div>

                {/* Enhanced ambient lighting effects */}
                <div className="absolute inset-0 bg-[#d9ccff] rounded-3xl opacity-30 blur-2xl -z-10 group-hover:opacity-40 transition-opacity duration-500"></div>
                <div className="absolute -inset-4 bg-gradient-to-r from-[#b7aaff]/10 via-[#b7aaff]/5 to-[#b7aaff]/10 rounded-3xl opacity-50 blur-xl -z-20"></div>
              </div>

              {/* Floating accent elements */}
              <div className="absolute -top-4 -left-4 w-20 h-20 bg-[#b7aaff]/10 rounded-full blur-xl opacity-60"></div>
              <div className="absolute -bottom-6 -right-6 w-16 h-16 bg-[#b7aaff]-glow/20 rounded-full blur-lg opacity-40"></div>
            </div>
          </div>
        </div>

        {/* Feature Cards - Elegant Refined Design */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-[#b7aaff]/20 via-purple-500/10 to-[#b7aaff]/5 rounded-xl blur-md opacity-60 group-hover:opacity-80 transition-opacity duration-300"></div>
            <div className="relative bg-black/40 backdrop-blur-xl border border-white/10 rounded-xl p-5 transition-all duration-300 hover:scale-[1.02] hover:border-[#b7aaff]/30 hover:shadow-xl hover:shadow-[#b7aaff]/20">
              <div className="flex items-start space-x-3 mb-3">
                <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-[#b7aaff]/20 to-purple-500/20 rounded-lg flex items-center justify-center">
                  <FileText className="h-4 w-4 text-indigo-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-white mb-1">Call summaries & details</h3>
                  <p className="text-xs text-gray-400 leading-relaxed">Automatic transcription and analysis</p>
                </div>
              </div>
              <p className="text-sm text-gray-300 leading-relaxed">
                Every conversation is automatically transcribed and summarized with key information highlighted.
              </p>
            </div>
          </div>

          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-[#b7aaff]/20 via-purple-500/10 to-[#b7aaff]/5 rounded-xl blur-md opacity-60 group-hover:opacity-80 transition-opacity duration-300"></div>
            <div className="relative bg-black/40 backdrop-blur-xl border border-white/10 rounded-xl p-5 transition-all duration-300 hover:scale-[1.02] hover:border-[#b7aaff]/30 hover:shadow-xl hover:shadow-[#b7aaff]/20">
              <div className="flex items-start space-x-3 mb-3">
                <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-[#b7aaff]/20 to-purple-500/20 rounded-lg flex items-center justify-center">
                  <Brain className="h-4 w-4 text-indigo-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-white mb-1">Expert on your business</h3>
                  <p className="text-xs text-gray-400 leading-relaxed">Trained with your knowledge base</p>
                </div>
              </div>
              <p className="text-sm text-gray-300 leading-relaxed">
                Train your AI agent with your specific knowledge base for accurate, personalized responses.
              </p>
            </div>
          </div>

          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-[#b7aaff]/20 via-purple-500/10 to-[#b7aaff]/5 rounded-xl blur-md opacity-60 group-hover:opacity-80 transition-opacity duration-300"></div>
            <div className="relative bg-black/40 backdrop-blur-xl border border-white/10 rounded-xl p-5 transition-all duration-300 hover:scale-[1.02] hover:border-[#b7aaff]/30 hover:shadow-xl hover:shadow-[#b7aaff]/20">
              <div className="flex items-start space-x-3 mb-3">
                <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-[#b7aaff]/20 to-purple-500/20 rounded-lg flex items-center justify-center">
                  <Shield className="h-4 w-4 text-indigo-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-white mb-1">Effortless oversight</h3>
                  <p className="text-xs text-gray-400 leading-relaxed">Intuitive monitoring dashboards</p>
                </div>
              </div>
              <p className="text-sm text-gray-300 leading-relaxed">
                Monitor performance, review conversations, and optimize your agent with intuitive dashboards.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}