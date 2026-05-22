"use client"

import { forwardRef, useState } from "react"
import { Eye, EyeOff } from "lucide-react"

interface OpInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  hint?: string
  suffix?: React.ReactNode
  inputPrefix?: React.ReactNode
}

export const OpInput = forwardRef<HTMLInputElement, OpInputProps>(
  ({ label, error, hint, suffix, inputPrefix, type, className = "", ...props }, ref) => {
    const [showPass, setShowPass] = useState(false)
    const isPassword = type === "password"
    const inputType = isPassword ? (showPass ? "text" : "password") : type

    return (
      <div className="flex flex-col w-full">
        <label
          className="text-[#9E9E9E]"
          style={{ fontSize: "0.75rem", marginBottom: 2 }}
        >
          {label}
        </label>

        <div className="relative flex items-center">
          {inputPrefix && (
            <div className="absolute left-0 bottom-2 flex items-center">{inputPrefix}</div>
          )}
          <input
            ref={ref}
            type={inputType}
            className={`op-input-underline ${error ? "op-input-error" : ""} ${isPassword ? "pr-8" : ""} ${inputPrefix ? "pl-5" : ""} ${className}`}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPass((v) => !v)}
              className="absolute right-0 bottom-2 text-[#9E9E9E] hover:text-[#1565C0] transition-colors"
              aria-label={showPass ? "Ocultar" : "Mostrar"}
            >
              {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          )}
          {suffix && !isPassword && (
            <div className="absolute right-0 bottom-2">{suffix}</div>
          )}
        </div>

        {error && (
          <p className="text-[#F44336] mt-1" style={{ fontSize: "0.75rem" }}>
            {error}
          </p>
        )}
        {hint && !error && (
          <p className="text-[#9E9E9E] mt-1" style={{ fontSize: "0.75rem" }}>
            {hint}
          </p>
        )}
      </div>
    )
  }
)
OpInput.displayName = "OpInput"
