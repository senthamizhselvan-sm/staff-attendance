"use client"

import { useEffect, useState } from "react"
// @ts-expect-error: No types for 'qrcode'
import QRCode from "qrcode"

export default function QRDisplay() {
  const [qrUrl, setQrUrl] = useState<string>("")

  useEffect(() => {
    const generateQR = async () => {
      const localNetworkUrl = "http://192.168.0.106:3001" // ✅ Your frontend accessible URL
      try {
        const dataUrl = await QRCode.toDataURL(localNetworkUrl)
        setQrUrl(dataUrl)
      } catch (error) {
        console.error("Failed to generate QR code:", error)
      }
    }

    generateQR()
  }, [])

  return (
    <div className="flex justify-center items-center">
      {qrUrl ? (
        <img src={qrUrl} alt="QR Code to open local app" className="w-40 h-40" />
      ) : (
        <p>Generating QR...</p>
      )}
    </div>
  )
}
