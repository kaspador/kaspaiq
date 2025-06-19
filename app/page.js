"use client";
import { useState, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import axios from "axios";
import Confetti from "react-confetti";

const KASPA_ADDRESS = "kaspa:qpv57800e5e4ejlxch6gpy02kfscj8a0gna8xkc6nw2g93els7mrsyufrfnjq";
const API_URL = `https://api.kaspa.org/addresses/${encodeURIComponent(KASPA_ADDRESS)}/balance`;

export default function Home() {
  const [status, setStatus] = useState(0); // 0: idle, 1: checking, 2: result
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [timer, setTimer] = useState(30);
  const [showConfetti, setShowConfetti] = useState(false);
  const intervalRef = useRef(null);

  const checkBalance = async () => {
    setStatus(1);
    setResult("");
    setError("");
    setTimer(30);
    setShowConfetti(false);
    let initialBalance = 0;
    try {
      const res = await axios.get(API_URL);
      initialBalance = Number(res.data.balance) / 1e8;
    } catch (e) {
      setError("Error fetching balance. Please try again later.");
      setStatus(0);
      return;
    }
    let found = false;
    let elapsed = 0;
    intervalRef.current = setInterval(() => {
      setTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    while (elapsed < 30) {
      await new Promise((r) => setTimeout(r, 3000));
      elapsed += 3;
      try {
        const res = await axios.get(API_URL);
        const newBalance = Number(res.data.balance) / 1e8;
        if (newBalance > initialBalance) {
          const received = newBalance - initialBalance;
          if (received < 10) setResult("Your IQ is <100");
          else setResult("Your IQ is 0");
          found = true;
          break;
        }
      } catch (e) {
        setError("Error fetching balance. Please try again later.");
        setStatus(0);
        clearInterval(intervalRef.current);
        return;
      }
    }
    clearInterval(intervalRef.current);
    if (!found) {
      setResult("Nothing has been received, your IQ is >100");
      setShowConfetti(true);
    }
    setStatus(2);
    setTimer(30);
  };

  return (
    <main className="container">
      <h1>Kaspaiq.com</h1>
      <p className="subtitle">Send any $kas amount to the below address to find out what is your IQ</p>
      <div className="qr-block" style={{ position: 'relative' }}>
        <QRCodeSVG value={KASPA_ADDRESS} size={180} bgColor="#fff" fgColor="#70C7BA" />
        {status === 1 && (
          <span
            className="qr-timer"
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 64,
              fontWeight: 700,
              color: '#FF4D4F',
              opacity: Math.max(0.2, timer / 30),
              pointerEvents: 'none',
              transition: 'opacity 0.5s',
              zIndex: 2,
            }}
          >
            {timer}
          </span>
        )}
        {showConfetti && <Confetti width={window.innerWidth} height={window.innerHeight} recycle={false} numberOfPieces={300} />}
        <p className="address">{KASPA_ADDRESS}</p>
      </div>
      <div className="button-timer-row">
        <button className="check-btn" onClick={checkBalance} disabled={status === 1}>
          I've sent $kas
        </button>
      </div>
      {result && <p className="result">{result}</p>}
      {error && <p className="error">{error}</p>}
      <footer className="disclaimer">This app is for entertainment purposes only.</footer>
    </main>
  );
} 