import { ArrowRight, Check } from "lucide-react"

export const FinalCTASection = () => {
  return (
    <section className="py-24 px-4">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Headline */}
        <h2 className="text-4xl md:text-5xl font-light mb-6 leading-tight text-black">
          Ready to Transform Your
          <br />
          <span className="text-indigo-500 font-medium">Customer Experience?</span>
        </h2>

        {/* Subheading */}
        <p className="text-lg text-gray-500 mb-12 max-w-2xl mx-auto">
          Join thousands of businesses already using AI voice agents to drive growth.
          No setup fees, no hidden costs, and no risk with our 30-day guarantee.
        </p>

        {/* Primary CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
          <button className="group px-8 py-4 bg-indigo-500 text-[#0d0e11] rounded-lg font-medium text-lg hover:bg-[#b7aaff]/90 transition-all duration-300 shadow-lg hover:shadow-xl">
            Start Free Trial
            <ArrowRight className="w-5 h-5 ml-2 inline group-hover:translate-x-1 transition-transform" />
          </button>
          <button className="px-8 py-4  bg-white text-black rounded-lg font-medium text-lg  transition-colors">
            Get Personalized Demo
          </button>
        </div>

        {/* Trust Indicators */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-[#b7aaff]" />
            <span>Start your risk-free trial today</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-[#b7aaff]" />
            <span>Setup in under 5 minutes</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-[#b7aaff]" />
            <span>Cancel anytime</span>
          </div>
        </div>
      </div>
    </section>
  )
}