import React from 'react'
import { Home, Settings, Phone, DollarSign, Users, Tag, Wand2, Shield, ArrowRight } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useNavigate } from 'react-router-dom'

export const TopCTA = () => {
  const { user } = useAuth()
  const navigate = useNavigate()

  const scrollToPricing = () => {
    const el = document.getElementById('pricing')
    if (el) el.scrollIntoView({ behavior: 'smooth' })
  }

  const handleDashboardClick = () => {
    navigate('/dashboard')
  }

  const handleLoginClick = () => {
    navigate('/login')
  }

  return (
    <div className="fixed top-4 right-8 z-50 flex items-center gap-3 backdrop-blur-md bg-white/20 border border-white/30 rounded-full px-4 py-2 shadow-lg">
      {user ? (
        <button 
          onClick={handleDashboardClick}
          className="text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors px-3 py-1 rounded-full hover:bg-white/20"
        >
          Dashboard
        </button>
      ) : (
        <button 
          onClick={handleLoginClick}
          className="text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors px-3 py-1 rounded-full hover:bg-white/20"
        >
          Log In
        </button>
      )}
      <button
        onClick={scrollToPricing}
        className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white px-4 py-2 rounded-full shadow-md hover:shadow-lg transition-all duration-300 backdrop-blur-sm"
      >
        Free Trial
      </button>
    </div>
  )
}
