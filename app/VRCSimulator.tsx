"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";
import { saveAs } from "file-saver";

// Reusable Modal Component
const Modal = ({ isOpen, onClose, title, children }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-75 flex justify-center items-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto transform transition-all duration-300 scale-100 opacity-100">
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-2xl font-semibold"
            aria-label="Close modal"
          >
            &times;
          </button>
        </div>
        <div className="p-6 text-gray-800 dark:text-gray-200">
          {children}
        </div>
      </div>
    </div>
  );
};


const getInitialTheme = () => {
  if (typeof window === 'undefined') {
    return false;
  }
  const storedPreference = localStorage.getItem('theme');
  const systemPreference = window.matchMedia('(prefers-color-scheme: dark)').matches;
  return storedPreference === 'dark' || (storedPreference === null && systemPreference);
};

// --- Pure helper function for parity calculation ---
const _computeParity = (bits: number[], mode: string): number => {
  const sum = bits.reduce((a: number, b: number) => a + b, 0);
  if (mode === "even") return sum % 2 === 0 ? 0 : 1;
  else return sum % 2 === 0 ? 1 : 0;
};

export default function VRCSimulator() {
  const [bitString, setBitString] = useState("010010000 011010011 011001010"); // "Hi" + "e"
  const [inputError, setInputError] = useState<string | null>(null);
  const [parityMode, setParityMode] = useState("even");
  
  const [receivedFrames, setReceivedFrames] = useState<number[][]>([]);
  const [detectedErrors, setDetectedErrors] = useState<boolean[]>([]);
  const [detectionLog, setDetectionLog] = useState<string[]>([]);
  const [errorSummary, setErrorSummary] = useState<string | null>(null);
  const [detectionResult, setDetectionResult] = useState<'success' | 'error' | null>(null);

  const [isDarkMode, setIsDarkMode] = useState(getInitialTheme);
  const [hasMounted, setHasMounted] = useState(false);
  
  const [showAlgorithm, setShowAlgorithm] = useState(false);
  
  const [showHowToUseModal, setShowHowToUseModal] = useState(false);
  const [showDevelopedByModal, setShowDevelopedByModal] = useState(false);
  const [showLearnModal, setShowLearnModal] = useState(false);


  const [flippedBitIndex, setFlippedBitIndex] = useState<{frame: number, bit: number} | null>(null);
  const [correctedBitIndices, setCorrectedBitIndices] = useState<number[]>([]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const resetDetection = (clearHighlights = true) => {
    setReceivedFrames([]);
    setDetectedErrors([]);
    setDetectionLog([]);
    setErrorSummary(null);
    setDetectionResult(null);
    if (clearHighlights) {
      setFlippedBitIndex(null);
      setCorrectedBitIndices([]);
    }
  };

  const validateAndParse = (str: string): number[][] | null => {
    const bitRegex = /^[01]{9}$/; // Must be exactly 9 bits
    const parts = str.trim().split(' ').filter(Boolean);
    
    if (parts.length === 0) {
      setInputError("Input cannot be empty.");
      return null;
    }

    const allFrames: number[][] = [];
    for (const part of parts) {
      if (!bitRegex.test(part)) {
        setInputError(`Invalid 9-bit frame: "${part}". Please use 9-bit blocks (e.g., 101010101) separated by spaces.`);
        return null;
      }
      allFrames.push(part.split('').map(Number));
    }

    setInputError(null);
    return allFrames;
  };

  const checkFrames = () => {
    resetDetection(true); 
    const allFrames = validateAndParse(bitString);
    if (!allFrames) return;

    const newErrors: boolean[] = [];
    const newLog: string[] = [];

    allFrames.forEach((frame, index) => {
      const data = frame.slice(0, 8);
      const receivedParity = frame[8];
      
      const oneCount = data.reduce((a: number, b: number) => a + b, 0);
      const expectedParity = _computeParity(data, parityMode);
      const isError = expectedParity !== receivedParity;
      
      newErrors.push(isError);
      
      let log = `[Row ${index + 1}]: Received Frame: ${data.join('')} [Parity: ${receivedParity}]\n`;
      log += `  1. Receiver Mode: ${parityMode.charAt(0).toUpperCase() + parityMode.slice(1)} Parity\n`;
      log += `  2. Count 1s in Data: Found ${oneCount} one(s).\n`;
      log += `  3. Calculate Expected Parity: For '${parityMode}' parity, ${oneCount} ones requires a parity bit of ${expectedParity}.\n`;
      log += `  4. Compare: Expected Parity (${expectedParity}) vs Received Parity (${receivedParity}).\n`;
      log += `  Result: ${isError ? '❌ ERROR DETECTED' : '✅ OK - Bits match.'}`;
      
      newLog.push(log);
    });
    
    setReceivedFrames(allFrames);
    setDetectedErrors(newErrors);
    setDetectionLog(newLog);
    
    const errorCount = newErrors.filter(Boolean).length;
    if (errorCount === 0) {
      setErrorSummary("✅ All clear! No errors were detected in the received frames.");
      setDetectionResult('success');
    } else {
      setErrorSummary(`⚠️ Error! ${errorCount} frame(s) failed the parity check.`);
      setDetectionResult('error');
    }
  };

  const generateRandomFrames = () => {
    let newBitString = "";
    for (let i = 0; i < 3; i++) { 
      const data: number[] = [];
      for (let j = 0; j < 8; j++) {
        // eslint-disable-next-line react-hooks/purity
        data.push(Math.round(Math.random()));
      }
      const parity = _computeParity(data, parityMode);
      newBitString += data.join('') + parity + ' ';
    }
    setBitString(newBitString.trim());
    resetDetection(true);
  };

  const simulateError = () => {
    resetDetection(false); 
    const allFrames = validateAndParse(bitString);
    if (!allFrames || allFrames.length === 0) {
      setInputError("Cannot simulate error on invalid data.");
      return;
    }
    
    const frameIndex = Math.floor(Math.random() * allFrames.length);
    const bitIndex = Math.floor(Math.random() * 9); 
    
    allFrames[frameIndex][bitIndex] = allFrames[frameIndex][bitIndex] ? 0 : 1;
    
    const newBitString = allFrames.map(frame => frame.join('')).join(' ');
    setBitString(newBitString);
    
    setFlippedBitIndex({ frame: frameIndex, bit: bitIndex });
    setCorrectedBitIndices([]);
    setReceivedFrames(allFrames); 
  };

  const correctFrames = () => {
    resetDetection(false); 
    const allFrames = validateAndParse(bitString);
    if (!allFrames) {
      setInputError("Cannot correct invalid data.");
      return;
    }
    
    const correctedIndices: number[] = [];
    const correctedFrames = allFrames.map((frame, i) => {
      const data = frame.slice(0, 8);
      const oldParity = frame[8];
      const correctParity = _computeParity(data, parityMode);
      
      if (oldParity !== correctParity) {
        correctedIndices.push(i); 
      }
      return [...data, correctParity]; 
    });
    
    const newBitString = correctedFrames.map(frame => frame.join('')).join(' ');
    setBitString(newBitString);
    
    setCorrectedBitIndices(correctedIndices);
    setFlippedBitIndex(null);
    setReceivedFrames(correctedFrames); 
  };
  
  const downloadLogAsDocx = () => {
    if (detectionLog.length === 0 || !errorSummary) {
      alert("Please run 'Check Frames' first to generate a log.");
      return;
    }

    const paragraphs: Paragraph[] = [];

    paragraphs.push(
      new Paragraph({
        text: "VRC Detection Procedure Log",
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 240 },
      })
    );

    detectionLog.forEach(log => {
      const lines = log.split('\n');
      
      if (lines[0]) {
        paragraphs.push(
          new Paragraph({
            children: [new TextRun({ text: lines[0], bold: true })],
            spacing: { after: 120 },
          })
        );
      }
      
      lines.slice(1).forEach(line => {
        paragraphs.push(
          new Paragraph({
            text: line,
            indent: { left: 720 }, // 720 twips = 0.5 inch
          })
        );
      });

      paragraphs.push(new Paragraph(""));
    });

    paragraphs.push(
      new Paragraph({
        text: "Final Summary:",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 120 },
      })
    );
    paragraphs.push(
      new Paragraph({
        text: errorSummary,
      })
    );

    const doc = new Document({
      sections: [{
        properties: {},
        children: paragraphs,
      }],
    });

    Packer.toBlob(doc).then(blob => {
      saveAs(blob, "vrc-detection-log.docx");
    });
  };
  
  const getBitClass = (bit: number, frameIdx: number, bitIdx: number): string => {
    const isFlipped = flippedBitIndex?.frame === frameIdx && flippedBitIndex?.bit === bitIdx;
    const isCorrected = correctedBitIndices.includes(frameIdx) && bitIdx === 8;
    const isParity = bitIdx === 8;

    let classes = "flex items-center justify-center w-6 h-6 rounded transition-all duration-200 ";

    if (isFlipped) {
      classes += "bg-yellow-200 ring-2 ring-yellow-500 text-yellow-900 dark:bg-yellow-500/50 dark:text-yellow-100 font-bold";
    } else if (isCorrected) {
      classes += "bg-purple-200 ring-2 ring-purple-500 text-purple-900 dark:bg-purple-500/50 dark:text-purple-100 font-bold";
    } else if (isParity) {
      classes += "bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 font-bold";
    } else {
      classes += "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200";
    }
    return classes;
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4 md:p-8 transition-colors duration-200">
      <div className="max-w-7xl mx-auto bg-white dark:bg-gray-800 shadow-xl rounded-lg overflow-hidden transition-colors duration-200">
        <div className="p-6 md:p-8">
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 sm:gap-0">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">
              Vertical Redundancy Check (VRC) Simulator
            </h1>
            
            <div className="flex flex-wrap gap-2 justify-end items-center">
              <button
                onClick={() => setShowHowToUseModal(true)}
                className="bg-gray-300 text-gray-800 dark:bg-gray-700 dark:text-gray-200 px-3 py-1 rounded-md shadow-sm font-medium hover:bg-gray-400 dark:hover:bg-gray-600 transition-colors"
              >
                How to Use
              </button>
              <button
                onClick={() => setShowDevelopedByModal(true)}
                className="bg-gray-300 text-gray-800 dark:bg-gray-700 dark:text-gray-200 px-3 py-1 rounded-md shadow-sm font-medium hover:bg-gray-400 dark:hover:bg-gray-600 transition-colors"
              >
                Developed By
              </button>
              <button
                onClick={() => setShowLearnModal(true)}
                className="bg-gray-300 text-gray-800 dark:bg-gray-700 dark:text-gray-200 px-3 py-1 rounded-md shadow-sm font-medium hover:bg-gray-400 dark:hover:bg-gray-600 transition-colors"
              >
                Learn VRC
              </button>
              <button
                onClick={downloadLogAsDocx}
                className="bg-gray-300 text-gray-800 dark:bg-gray-700 dark:text-gray-200 px-3 py-1 rounded-md shadow-sm font-medium hover:bg-gray-400 dark:hover:bg-gray-600 transition-colors"
              >
                Download
              </button>

              <div className="h-10 w-10 ml-2"> 
                {hasMounted && (
                  <button
                    onClick={() => setIsDarkMode(!isDarkMode)}
                    aria-label="Toggle theme"
                    className="relative flex items-center justify-center h-10 w-10 p-2 rounded-full text-gray-700 dark:text-gray-200 transition-transform duration-300 ease-in-out hover:scale-110 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <span className="sr-only">Toggle theme</span>
                    <span className={`absolute inset-0 flex items-center justify-center text-2xl transform transition-all duration-300 ${ isDarkMode ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100' }`} aria-hidden="true" >☀️</span>
                    <span className={`absolute inset-0 flex items-center justify-center text-2xl transform transition-all duration-300 ${ isDarkMode ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0' }`} aria-hidden="true" >🌙</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-base font-semibold text-gray-700 dark:text-gray-300 mb-2 tracking-wide">
                9-Bit Frames (8 Data + 1 Parity):
              </label>
              <textarea
                className={`font-mono border border-gray-300 p-2 rounded w-full shadow-sm focus:ring-2 focus:outline-none dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 ${
                  inputError ? 'ring-2 ring-red-500 border-red-500' : 'focus:ring-blue-500'
                }`}
                rows={2}
                value={bitString}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setBitString(e.target.value)}
                placeholder="e.g., 010010000 011010011"
              />
              {inputError && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{inputError}</p>
              )}
            </div>
            
            <div>
              <label className="block text-base font-semibold text-gray-700 dark:text-gray-300 mb-2 tracking-wide">
                Parity Mode (for Checking):
              </label>
              <select
                className="border border-gray-300 p-2 rounded w-full bg-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600"
                value={parityMode}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setParityMode(e.target.value)}
              >
                <option value="even">Even Parity</option>
                <option value="odd">Odd Parity</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 mb-6">
            <button
              className="bg-blue-600 text-white px-4 py-2 rounded-md shadow-md font-medium transform transition-all duration-200 hover:bg-blue-700 hover:scale-105 active:scale-95"
              onClick={generateRandomFrames}
            >
              Generate Random Frames (Sender)
            </button>
            <button
              className="bg-yellow-500 text-white px-4 py-2 rounded-md shadow-md font-medium transform transition-all duration-200 hover:bg-yellow-600 hover:scale-105 active:scale-95"
              onClick={simulateError}
            >
              Simulate 1-Bit Error
            </button>
            <button
              className="bg-purple-600 text-white px-4 py-2 rounded-md shadow-md font-medium transform transition-all duration-200 hover:bg-purple-700 hover:scale-105 active:scale-95"
              onClick={correctFrames}
            >
              Correct Parity Bits
            </button>
            <button
              className="bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-200 px-4 py-2 rounded-md shadow-md font-medium transform transition-all duration-200 hover:scale-105 active:scale-95"
              onClick={() => setShowAlgorithm(!showAlgorithm)}
            >
              {showAlgorithm ? "Hide" : "Show"} VRC Algorithm
            </button>
            <button
              className={`font-bold text-white px-6 py-2 rounded-md shadow-md transform transition-all duration-200 hover:scale-105 active:scale-95 ml-auto
                ${detectionResult === 'success' ? 'bg-green-600 hover:bg-green-700' : ''}
                ${detectionResult === 'error' ? 'bg-red-600 hover:bg-red-700' : ''}
                ${!detectionResult ? 'bg-green-600 hover:bg-green-700' : ''}
              `}
              onClick={checkFrames}
            >
              Check Frames (Receiver)
            </button>
          </div>
          
          {showAlgorithm && (
            <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border dark:border-gray-700">
              <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-3">How VRC (Parity Check) Works</h3>
              <ol className="list-decimal list-inside space-y-2 text-gray-700 dark:text-gray-300">
                <li>The Receiver gets a frame (e.g., 8 data bits + 1 parity bit).</li>
                <li>A <strong>Parity Mode</strong> (Even or Odd) is agreed upon.</li>
                <li>The Receiver counts the number of <strong>1s</strong> in the <strong>8 data bits</strong>.</li>
                <li>
                  <strong>If Even Parity:</strong>
                  <ul className="list-disc list-inside ml-5 mt-1">
                    <li>If the count of 1s is even (0, 2, 4, 6, 8), the expected parity bit is <strong>0</strong>.</li>
                    <li>If the count of 1s is odd (1, 3, 5, 7), the expected parity bit is <strong>1</strong>.</li>
                  </ul>
                </li>
                <li>
                  <strong>If Odd Parity:</strong>
                  <ul className="list-disc list-inside ml-5 mt-1">
                    <li>If the count of 1s is even (0, 2, 4, 6, 8), the expected parity bit is <strong>1</strong>.</li>
                    <li>If the count of 1s is odd (1, 3, 5, 7), the expected parity bit is <strong>0</strong>.</li>
                  </ul>
                </li>
                <li>The Receiver compares its <strong>Expected Parity Bit</strong> with the <strong>Received Parity Bit</strong> (the 9th bit).</li>
                <li>If they match, the frame is <strong>OK</strong>. If they do not match, an <strong>Error</strong> is detected.</li>
              </ol>
            </div>
          )}

          {receivedFrames.length > 0 && (
            <>
              <div className="overflow-x-auto border border-gray-200 dark:border-gray-600 rounded-lg">
                <table className="w-full table-auto text-sm">
                  <thead className="bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                    <tr>
                      <th className="p-3 text-left font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Received Frame (Data + Parity)
                      </th>
                      <th className="p-3 text-left font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                    {receivedFrames.map((row: number[], i: number) => (
                        <tr
                          key={i}
                          className={`transition-colors duration-200 ${
                            detectedErrors[i]
                              ? "bg-red-100 text-red-900 dark:bg-red-900/30 dark:text-red-200"
                              :"hover:bg-gray-50 dark:hover:bg-gray-700/50"
                          }`}
                        >
                          <td className="p-3">
                            <div className="flex gap-1 flex-wrap font-mono items-center">
                              {row.map((bit, j) => (
                                <span key={j} className={getBitClass(bit, i, j)}>
                                  {bit}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="p-3 w-32 text-center">
                            {detectedErrors[i] && (
                              <span className="font-bold text-red-700 dark:text-red-300">Error!</span>
                            )}
                            {!detectedErrors[i] && (
                              <span className="text-gray-600 dark:text-gray-400 font-medium">OK</span>
                            )}
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>

              {detectionLog.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-2">
                    Detection Procedure Log
                  </h3>
                  <div className="bg-gray-100 dark:bg-gray-900 rounded-lg p-4 font-mono text-sm text-gray-800 dark:text-gray-300 overflow-x-auto">
                    {detectionLog.map((log, index) => (
                      <p key={index} className="whitespace-pre-wrap mb-2 border-b border-gray-200 dark:border-gray-700 pb-2">
                        {log}
                      </p>
                    ))}
                  </div>
                </div>
              )}
              
              {errorSummary && (
                <div
                  className={`mt-4 p-4 rounded-lg text-center font-semibold text-lg ${
                    detectionResult === 'success'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200'
                      : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200'
                  }`}
                >
                  {errorSummary}
                </div>
              )}
            </>
          )}
        </div>
      </div>
      
      <footer className="text-center mt-8 pb-4 text-gray-500 dark:text-gray-400 text-sm">
        <p>Devansh Arora - 24BCE5331</p>
        <p>Himalaya Sharma - 24BCE5168</p>
      </footer>

      {/* --- How to Use Modal --- */}
      <Modal
        isOpen={showHowToUseModal}
        onClose={() => setShowHowToUseModal(false)}
        title="How to Use the VRC Simulator"
      >
        <div className="space-y-4">
          <p>{"Welcome to the Vertical Redundancy Check (VRC) Simulator! This tool helps you understand how VRC works in detecting errors during data transmission."}</p>
          
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">1. Input 9-Bit Frames:</h3>
          <p>
            {"Enter 9-bit binary frames (8 data bits + 1 parity bit) in the text area."}
            {"Each frame should be separated by a space (e.g., "}<code>010010000 011010011</code>{")."}
            {"The simulator will automatically validate your input."}
          </p>
          
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">2. Select Parity Mode:</h3>
          <p>
            {'Choose either "Even Parity" or "Odd Parity" from the dropdown. This mode determines how the receiver expects the parity bit to be calculated.'}
          </p>

          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">3. Control Buttons:</h3>
          <ul className="list-disc list-inside ml-4 space-y-2">
            <li>
              <strong>Generate Random Frames:</strong> {"Populates the input with 3 random 9-bit frames based on the current parity mode."}
            </li>
            <li>
              <strong>Simulate 1-Bit Error:</strong> {"Flips a single random bit in one of the existing frames. The flipped bit will be highlighted in "}<span className="text-yellow-500 font-bold">yellow</span>.
            </li>
            <li>
              <strong>Correct Parity Bits:</strong> {"Recalculates and sets the correct parity bit for each frame based on the selected mode. Corrected parity bits will be highlighted in "}<span className="text-purple-500 font-bold">purple</span>.
            </li>
            <li>
              <strong>Show VRC Algorithm:</strong> {"Toggles a detailed text explanation of the VRC process."}
            </li>
            <li>
              <strong>Check Frames (Receiver):</strong> {"This is the main action. It performs the VRC check on all input frames and displays:"}
              <ul className="list-disc list-inside ml-4">
                <li>{"A table showing each received frame and its detection status (OK or Error)." }</li>
                <li>{"A detailed \"Detection Procedure Log\" for each frame, explaining the calculation step-by-step."}</li>
                <li>{"An overall summary of detected errors."}</li>
              </ul>
            </li>
          </ul>

          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">4. Dark Mode Toggle:</h3>
          <p>
            {"Use the ☀️/🌙 button on the top right to switch between light and dark themes."}
          </p>

          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">5. Understanding the Results:</h3>
          <p>
            {"Pay attention to the \"Detection Procedure Log\" to see why an error was or wasn't detected."}
            {"Remember, VRC can detect single-bit errors and odd numbers of errors, but it cannot detect an even number of errors."}
          </p>
        </div>
      </Modal>

      {/* --- UPDATED: Developed By Modal --- */}
      <Modal
        isOpen={showDevelopedByModal}
        onClose={() => setShowDevelopedByModal(false)}
        title="Developed By"
      >
        <div className="space-y-6">
          <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 space-y-4">
            <h3 className="text-lg font-semibold mb-2">NAME - REG.NO.</h3>
            
            

            {/* --- Himalaya --- */}
            <div className="flex items-center space-x-4">
              <Image
                src="/VRC_Simulator/himalaya.png"
                alt="Himalaya Sharma"
                width={80}
                height={80}
                className="rounded-full object-cover flex-shrink-0"
              />
              <div>
                <p className="font-semibold text-gray-900 dark:text-gray-100">Himalaya Sharma</p>
                <p className="text-gray-700 dark:text-gray-300">24BCE5168</p>
              </div>
            </div>

            {/* --- Devansh --- */}
            <div className="flex items-center space-x-4">
              <Image
                src="/VRC_Simulator/devansh.png"
                alt="Devansh Arora"
                width={80}
                height={80}
                className="rounded-full object-cover flex-shrink-0"
              />
              <div>
                <p className="font-semibold text-gray-900 dark:text-gray-100">Devansh Arora</p>
                <p className="text-gray-700 dark:text-gray-300">24BCE5331</p>
              </div>
            </div>
          </div>

          
          
          <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 flex items-center space-x-4">
            <Image
              src="/VRC_Simulator/guide-photo.jpg"
              alt="Guide's Photo"
              width={96} // w-24
              height={96} // h-24
              className="rounded-md object-cover flex-shrink-0"
            />
            <div>
              <h3 className="text-lg font-semibold mb-1">Guided By:</h3>
              <p className="text-gray-700 dark:text-gray-300"> {"Dr. Swaminathan Annadurai"}</p>
            </div>
          </div>
        </div>
      </Modal>

      {/* --- Learn VRC Modal --- */}
      <Modal
        isOpen={showLearnModal}
        onClose={() => setShowLearnModal(false)}
        title="Learn More About VRC (Vertical Redundancy Check)"
      >
        <div className="space-y-6">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Concept of Parity Checking</h3>
          <p>
            {"Vertical Redundancy Check (VRC), also known as a single-bit parity check, is the simplest form of error detection. As discussed in networking textbooks like "}<strong className="text-gray-900 dark:text-gray-100">{"Kurose & Ross, \"Computer Networking: A Top-Down Approach,\""}</strong>{", it's a form of in-band error control that operates at the link layer."}
          </p>
          <p>
            {"The core idea is to add a single bit (the parity bit) to a block of data (e.g., an 8-bit byte). The sender sets this bit to 1 or 0 to ensure the total number of '1's in the resulting frame is either even (for Even Parity) or odd (for Odd Parity)."}
          </p>

          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">How VRC Works (Sender vs. Receiver)</h3>
          <ul className="list-disc list-inside ml-4 space-y-2">
            <li>
              <strong>{"Sender's Role:"}</strong>
              <p className="ml-4">{"The sender takes the data (e.g., 8 bits), counts the number of 1s, and appends the correct parity bit to create the transmittable frame (9 bits)."}</p>
              <ul className="list-disc list-inside ml-10 mt-1">
                <li><strong>Even Parity Example:</strong> {"Data is"} <code>10110010</code> {"(has 4 ones). Since 4 is already even, the sender adds a"} <code>0</code>. {"The frame sent is"} <code>101100100</code>.</li>
                <li><strong>Odd Parity Example:</strong> {"Data is"} <code>10110010</code> {"(has 4 ones). To make the total (5) odd, the sender adds a"} <code>1</code>. {"The frame sent is"} <code>101100101</code>.</li>
              </ul>
            </li>
            <li>
              <strong>{"Receiver's Role:"}</strong>
              <p className="ml-4">{"The receiver gets the full frame (9 bits). It separates the data (8 bits) from the received parity bit. It then re-calculates its own 'expected' parity from the 8 data bits and compares it to the received parity bit."}</p>
              <ul className="list-disc list-inside ml-10 mt-1">
                <li>If they match, the frame is assumed to be <strong>OK</strong>.</li>
                <li>If they do not match, the frame is flagged as an <strong>ERROR</strong>.</li>
              </ul>
            </li>
          </ul>
          
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Key Limitations</h3>
          <p>
            <strong>Inability to Detect Even-Bit Errors:</strong> {"As Kurose & Ross note, a single-bit parity check can only detect single-bit errors (and any odd number of errors). If two bits (or any even number of bits) are flipped during transmission, the parity will still appear correct, and the error will go undetected."}
          </p>
          <p>
            {"For example, if `101100100` (even parity) is sent and corrupted to `101000100` (two bits flipped), the receiver will still count 4 ones and assume the frame is correct. This is why VRC is considered weak and often combined with other methods (like LRC - Longitudinal Redundancy Check) or superseded by more robust methods like Checksums and Cyclic Redundancy Checks (CRC) for critical applications."}
          </p>
          
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Beyond VRC: Two-Dimensional Parity (LRC)</h3>
          <p>
            {"Because VRC is unreliable for 'burst errors' (multiple bit flips), it is often combined with a"} <strong>Longitudinal Redundancy Check (LRC)</strong> {"to create a two-dimensional parity check."}
          </p>
          <p>{"Imagine stacking the data bytes on top of each other in a table:"}</p>
          <ul className="list-disc list-inside ml-4 space-y-2">
            <li><strong>VRC (Vertical):</strong> {"A parity bit is calculated for each *byte* (the row). This is what our simulator does."}</li>
            <li><strong>LRC (Longitudinal):</strong> {"A final, new byte (called the 'checksum' or 'LRC byte') is created by calculating the parity for each *bit column* (e.g., all the 1st bits, all the 2nd bits, etc.)."}</li>
          </ul>
          <p>
            {"This 2D grid allows the receiver to not only *detect* most multi-bit errors but also, in many cases, *correct* the single bit error by finding the exact (row, column) intersection that failed both checks."}
          </p>


          <div>
            <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">Animation & Tutorial (Video):</h3>
            <div className="rounded-lg overflow-hidden border dark:border-gray-700">
              <iframe 
                width="100%" 
                height="415" 
                src="https://www.youtube.com/embed/UwERCzJv-y8?si=si9QwXikc0XOjva-" 
                title="YouTube video player: Parity Bit Explained" 
                frameBorder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowFullScreen
                className="w-full"
              ></iframe>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">References:</h3>
            <ul className="list-disc list-inside ml-4 space-y-2">
              <li className="text-gray-700 dark:text-gray-300">
                <strong>Kurose, J. F., & Ross, K. W. (2017). *Computer Networking: A Top-Down Approach* (6th ed.). Pearson Education.</strong> (See Chapter 6: The Link Layer and LANs)
              </li>
              <li>
                <a href="https://www.geeksforgeeks.org/vertical-redundancy-check-vrc/" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">
                  {"GeeksforGeeks: Vertical Redundancy Check (VRC)"}
                </a>
              </li>
            </ul>
          </div>
        </div>
      </Modal>
    </div>
  );
}