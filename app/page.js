"use client";
import { useState, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import axios from "axios";
import Confetti from "react-confetti";
import html2canvas from "html2canvas";

const KASPA_ADDRESS = "kaspa:qpv57800e5e4ejlxch6gpy02kfscj8a0gna8xkc6nw2g93els7mrsyufrfnjq";
const API_URL = `https://api.kaspa.org/addresses/${encodeURIComponent(KASPA_ADDRESS)}/balance`;
const TX_API_URL = `https://api.kaspa.org/addresses/${encodeURIComponent(KASPA_ADDRESS)}/full-transactions?limit=100&offset=0&resolve_previous_outpoints=no`;

export default function Home() {
  const [status, setStatus] = useState(0); // 0: idle, 1: checking, 2: result
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [timer, setTimer] = useState(30);
  const [showConfetti, setShowConfetti] = useState(false);
  const [newTxs, setNewTxs] = useState([]);
  const intervalRef = useRef(null);
  const certificateRef = useRef(null);
  const [lastAmount, setLastAmount] = useState(null);

  const checkBalance = async () => {
    setStatus(1);
    setResult("");
    setError("");
    setTimer(30);
    setShowConfetti(false);
    setNewTxs([]);
    let initialBalance = 0;
    let initialTxIds = [];
    try {
      const res = await axios.get(API_URL);
      initialBalance = Number(res.data.balance) / 1e8;
      const txRes = await axios.get(TX_API_URL);
      initialTxIds = txRes.data.map(tx => tx.transaction_id);
    } catch (e) {
      setError("Error fetching balance or transactions. Please try again later.");
      setStatus(0);
      return;
    }
    let found = false;
    let elapsed = 0;
    let detectedTxs = [];
    intervalRef.current = setInterval(() => {
      setTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    while (elapsed < 30) {
      await new Promise((r) => setTimeout(r, 3000));
      elapsed += 3;
      try {
        const txRes = await axios.get(TX_API_URL);
        const allTxs = txRes.data;
        // Find new transactions not in initialTxIds
        const newOnes = allTxs.filter(tx => !initialTxIds.includes(tx.transaction_id));
        // For each new transaction, check if it has outputs to our address
        const receivedTxs = newOnes.map(tx => {
          const receivedOutputs = (tx.outputs || []).filter(
            out => out.script_public_key_address === KASPA_ADDRESS
          );
          const amount = receivedOutputs.reduce((sum, out) => sum + Number(out.amount) / 1e8, 0);
          return amount > 0
            ? {
                txid: tx.transaction_id,
                amount,
                sender:
                  tx.inputs && tx.inputs.length > 0 && tx.inputs[0].previous_outpoint_address
                    ? tx.inputs[0].previous_outpoint_address
                    : 'unknown',
              }
            : null;
        }).filter(Boolean);
        if (receivedTxs.length > 0) {
          detectedTxs = receivedTxs;
          setNewTxs(detectedTxs);
          // Sum all new received amounts
          const totalReceived = detectedTxs.reduce((sum, tx) => sum + tx.amount, 0);
          setLastAmount(totalReceived);
          if (totalReceived < 10) setResult("Your IQ is <100");
          else setResult("Your IQ is 0");
          found = true;
          break;
        }
      } catch (e) {
        setError("Error fetching transactions. Please try again later.");
        setStatus(0);
        clearInterval(intervalRef.current);
        return;
      }
    }
    clearInterval(intervalRef.current);
    if (!found) {
      setResult("Nothing has been received, your IQ is >100");
      setShowConfetti(true);
      setLastAmount(null);
    }
    setStatus(2);
    setTimer(30);
  };

  // Download certificate as image
  const downloadCertificate = async () => {
    if (!certificateRef.current) return;
    const canvas = await html2canvas(certificateRef.current);
    const link = document.createElement("a");
    link.download = "kaspa-iq-certificate.png";
    link.href = canvas.toDataURL();
    link.click();
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
      {result && (
        <>
          <div ref={certificateRef} className="certificate-card">
            <img src="/kaspaiq-preview.png" alt="Kaspa Logo" style={{ width: 80, marginBottom: 12 }} />
            <h2>Kaspa IQ Certificate</h2>
            <p>Your IQ: <b>{result}</b></p>
            {lastAmount !== null && <p>Sent Amount: <b>{lastAmount} KAS</b></p>}
            <p style={{ fontSize: 12, color: '#888' }}>{KASPA_ADDRESS}</p>
          </div>
          <div className="certificate-actions">
            <button onClick={downloadCertificate} className="check-btn">Download Certificate</button>
            <a
              className="check-btn"
              style={{ textDecoration: 'none', display: 'inline-block', marginLeft: 8 }}
              href={`https://twitter.com/intent/tweet?text=I%20just%20tested%20my%20Kaspa%20IQ%20at%20Kaspaiq.com%20and%20got%20${encodeURIComponent(result)}!%20Try%20it%20yourself%3A%20https%3A%2F%2Fkaspaiq.com`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Share on X
            </a>
            <a
              className="check-btn"
              style={{ textDecoration: 'none', display: 'inline-block', marginLeft: 8 }}
              href={`https://t.me/share/url?url=https://kaspaiq.com&text=I just tested my Kaspa IQ at Kaspaiq.com and got ${encodeURIComponent(result)}!`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Share on Telegram
            </a>
          </div>
        </>
      )}
      {error && <p className="error">{error}</p>}
      {newTxs.length > 0 && (
        <div className="tx-list">
          <h3>New Transactions:</h3>
          <ul>
            {newTxs.map(tx => (
              <li key={tx.txid} style={{marginBottom: 8}}>
                <b>Amount:</b> {tx.amount} KAS<br/>
                <b>Sender:</b> {tx.sender}<br/>
                <b>TxID:</b> <a href={`https://explorer.kaspa.org/txs/${tx.txid}`} target="_blank" rel="noopener noreferrer">{tx.txid.slice(0,12)}...</a>
              </li>
            ))}
          </ul>
        </div>
      )}
      <footer className="disclaimer">This app is for entertainment purposes only.</footer>
    </main>
  );
} 