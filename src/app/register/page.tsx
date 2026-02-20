"use client"

import { useState, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { RingchatLogo } from "@/components/RingchatLogo"
import { ArrowLeft, ArrowRight, Eye, EyeOff, Upload, X, AlertTriangle, Loader2, CircleUserRound, Lock, Calendar, AtSign } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import bcrypt from "bcryptjs"
import { useAuth } from "@/context/AuthContext"

interface FormData {
  fullName: string
  username: string
  gender: "Male" | "Female" | ""
  dateOfBirth: string
  profilePicture: string
  password: string
  confirmPassword: string
}

export default function RegisterPage() {
  const router = useRouter()
  const { setUser } = useAuth()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [formData, setFormData] = useState<FormData>({
    fullName: "",
    username: "",
    gender: "",
    dateOfBirth: "",
    profilePicture: "",
    password: "",
    confirmPassword: ""
  })

  const [errors, setErrors] = useState<Partial<FormData>>({})

  const validateStep1 = () => {
    const newErrors: Partial<FormData> = {}
    
    if (!formData.fullName.trim()) {
      newErrors.fullName = "Full name is required"
    }
    
    if (!formData.username.trim()) {
      newErrors.username = "Username is required"
    } else if (!/^[a-zA-Z0-9]+$/.test(formData.username)) {
      newErrors.username = "Letters and numbers only"
    }
    
    if (!formData.gender) {
      newErrors.gender = "Please select gender"
    }
    
    if (!formData.dateOfBirth) {
      newErrors.dateOfBirth = "Date of birth is required"
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validateStep3 = () => {
    const newErrors: Partial<FormData> = {}
    
    if (!formData.password) {
      newErrors.password = "Password is required"
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters"
    }
    
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match"
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const checkUsernameAvailable = async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('users')
      .select('username')
      .eq('username', formData.username.toLowerCase())
      .single()
    
    return !data
  }

  const handleNext = async () => {
    if (step === 1) {
      if (!validateStep1()) return
      
      setLoading(true)
      const available = await checkUsernameAvailable()
      setLoading(false)
      
      if (!available) {
        setErrors({ username: "Username already taken" })
        return
      }
      
      setStep(2)
    } else if (step === 2) {
      setStep(3)
    }
  }

  const handleBack = () => {
    if (step > 1) setStep(step - 1)
    else router.push("/")
  }

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement("canvas")
        const size = Math.min(img.width, img.height)
        canvas.width = 400
        canvas.height = 400
        
        const ctx = canvas.getContext("2d")
        if (!ctx) return
        
        const sx = (img.width - size) / 2
        const sy = (img.height - size) / 2
        
        ctx.drawImage(img, sx, sy, size, size, 0, 0, 400, 400)
        
        const dataUrl = canvas.toDataURL("image/jpeg", 0.8)
        setFormData(prev => ({ ...prev, profilePicture: dataUrl }))
      }
      img.src = event.target?.result as string
    }
    reader.readAsDataURL(file)
  }, [])

    const handleSubmit = async () => {
      if (!validateStep3()) return
      
      setLoading(true)
      try {
        const supabase = createClient()
        const passwordHash = await bcrypt.hash(formData.password, 10)

        // Upload profile picture to Supabase Storage if provided
        let profilePictureUrl = ""
        if (formData.profilePicture) {
          try {
            const res = await fetch(formData.profilePicture)
            const blob = await res.blob()
            const fileName = `${formData.username.toLowerCase()}_${Date.now()}.jpg`
            const { data: uploadData, error: uploadError } = await supabase.storage
              .from('avatars')
              .upload(fileName, blob, { contentType: 'image/jpeg', upsert: true })
            if (!uploadError && uploadData) {
              const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(uploadData.path)
              profilePictureUrl = urlData.publicUrl
            }
          } catch {
            // If upload fails, continue without picture
          }
        }
        
          const { data: newUser, error } = await supabase.from('users').insert({
            username: formData.username.toLowerCase(),
            full_name: formData.fullName,
            gender: formData.gender,
            date_of_birth: formData.dateOfBirth,
            profile_picture: profilePictureUrl,
            password_hash: passwordHash,
            bio: "",
            notifications_enabled: true,
            is_online: true
          }).select().single()

          if (error) {
            if (error.code === '23505') {
              toast.error("Username already exists")
            } else {
              toast.error(`Failed to create account: ${error.message}`)
            }
            return
          }

          // Auto-login: set user in context + localStorage
          setUser(newUser)
          localStorage.setItem('ringchat_user', JSON.stringify(newUser))

          toast.success("Welcome to Ringchat!")
          router.push("/chats")
    } catch {
      toast.error("Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  const passwordsMatch = formData.password && formData.confirmPassword && formData.password === formData.confirmPassword

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-white to-green-50 dark:from-slate-900 dark:to-slate-800">
      <header className="flex items-center p-4 gap-4">
        <button 
          onClick={handleBack}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <span className="text-sm text-muted-foreground">Step {step} of 3</span>
      </header>

      <main className="flex-1 flex flex-col items-center px-6 pt-4 pb-8">
        <RingchatLogo size={60} />
        <h1 className="mt-4 text-2xl font-bold font-syne">Create Account</h1>

        <div className="mt-6 w-full max-w-sm">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ x: 50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -50, opacity: 0 }}
                className="space-y-4"
              >
                <div>
                  <label className="text-sm font-medium mb-1 block">Full Name</label>
                  <div className="relative">
                    <CircleUserRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                      type="text"
                      value={formData.fullName}
                      onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                      className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                      placeholder="Enter your full name"
                    />
                  </div>
                  {errors.fullName && <p className="text-red-500 text-xs mt-1">{errors.fullName}</p>}
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">Username</label>
                  <div className="relative">
                    <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                      type="text"
                      value={formData.username}
                      onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value.replace(/[^a-zA-Z0-9]/g, '') }))}
                      className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                      placeholder="username"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 ml-1">Letters and numbers only</p>
                  {errors.username && <p className="text-red-500 text-xs mt-1">{errors.username}</p>}
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Gender</label>
                  <div className="flex gap-3">
                    {["Male", "Female"].map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, gender: g as "Male" | "Female" }))}
                        className={`flex-1 py-3 rounded-xl border-2 font-medium transition-all ${
                          formData.gender === g
                            ? "border-green-500 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                            : "border-gray-200 dark:border-slate-600 hover:border-green-300"
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                  {errors.gender && <p className="text-red-500 text-xs mt-1">{errors.gender}</p>}
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">Date of Birth</label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={(e) => setFormData(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                      className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                    />
                  </div>
                  {errors.dateOfBirth && <p className="text-red-500 text-xs mt-1">{errors.dateOfBirth}</p>}
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ x: 50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -50, opacity: 0 }}
                className="space-y-6"
              >
                <p className="text-center text-muted-foreground">Preview your profile</p>
                
                <div className="flex flex-col items-center">
                  <div className="relative">
                    <div 
                      className="w-28 h-28 rounded-full bg-gray-200 dark:bg-slate-700 flex items-center justify-center overflow-hidden border-4 border-green-500 cursor-pointer"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {formData.profilePicture ? (
                        <img src={formData.profilePicture} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <Upload className="w-8 h-8 text-muted-foreground" />
                      )}
                    </div>
                    {formData.profilePicture && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setFormData(prev => ({ ...prev, profilePicture: "" })); }}
                        className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center z-10"
                      >
                        <X className="w-4 h-4 text-white" />
                      </button>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-3 text-sm text-green-600 dark:text-green-400 font-medium"
                  >
                    {formData.profilePicture ? "Change Photo" : "Add Photo"}
                  </button>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-700">
                  <div className="text-center">
                    <h3 className="text-xl font-bold">{formData.fullName || "Your Name"}</h3>
                    <p className="text-muted-foreground">@{formData.username.toLowerCase() || "username"}</p>
                  </div>
                  <div className="mt-4 flex justify-center gap-6 text-sm text-muted-foreground">
                    <span>{formData.gender || "Gender"}</span>
                    <span>•</span>
                    <span>{formData.dateOfBirth ? new Date(formData.dateOfBirth).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : "Birth Date"}</span>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ x: 50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -50, opacity: 0 }}
                className="space-y-4"
              >
                <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-xl p-4 flex gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    Remember this password. There is no way to reset it if forgotten.
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                      className="w-full pl-11 pr-12 py-3 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                      placeholder="Enter password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">Retype Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      className="w-full pl-11 pr-12 py-3 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                      placeholder="Retype password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

          <div className="mt-8 w-full max-w-sm md:max-w-md">
          {step < 3 ? (
            <button
              onClick={handleNext}
              disabled={loading}
              className="w-full py-4 rounded-full bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold text-lg shadow-lg shadow-green-500/30 hover:shadow-green-500/50 transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Continue <ArrowRight className="w-5 h-5" /></>}
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading || !passwordsMatch}
              className={`w-full py-4 rounded-full font-semibold text-lg shadow-lg transition-all duration-300 flex items-center justify-center gap-2 ${
                passwordsMatch
                  ? "bg-gradient-to-r from-green-500 to-green-600 text-white shadow-green-500/30 hover:shadow-green-500/50"
                  : "bg-gray-200 dark:bg-slate-700 text-gray-400 dark:text-slate-500 cursor-not-allowed"
              }`}
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Complete Registration"}
            </button>
          )}
        </div>
      </main>

      <footer className="py-6 text-center text-sm text-muted-foreground">
        © Ringchat 2026. All rights reserved.
      </footer>
    </div>
  )
}
