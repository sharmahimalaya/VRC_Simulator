"use client";

import React, { useState, useEffect } from "react";

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
  
  // --- NEW: State for algorithm toggle ---
  const [showAlgorithm, setShowAlgorithm] = useState(false);
  
  const [flippedBitIndex, setFlippedBitIndex] = useState<{frame: number, bit: number} | null>(null);
  const [correctedBitIndices, setCorrectedBitIndices] = useState<number[]>([]);

  useEffect(() => {
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
      
      const oneCount = data.reduce((a, b) => a + b, 0);
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
          
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">
              Vertical Redundancy Check (VRC) Simulator
            </h1>
            
            <div className="h-10 w-10"> 
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

          {/* --- UPDATED: Added Show Algorithm Button --- */}
          <div className="flex flex-wrap gap-3 mb-6">
            <button
              className="bg-blue-600 text-white px-4 py-2 rounded-md shadow-md font-medium transform transition-all duration-200 hover:bg-blue-700 hover:scale-105 active:scale-95"
              onClick={generateRandomFrames}
            >
              Generate Random Frames
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
          
          {/* --- NEW: Algorithm Display Box --- */}
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
                      : 'bg-red-100 text-red-800 dark:bg-red-900/5Code/50 dark:text-red-200'
                  }`}
                >
                  {errorSummary}
                </div>
              )}
            </>
          )}
        </div>
      </div>
      
      {/* --- NEW: Footer --- */}
      <footer className="text-center mt-8 pb-4 text-gray-500 dark:text-gray-400 text-sm">
        <p>Devansh Arora - 24BCE5331</p>
        <p>Himalaya Sharma - 24BCE5168</p>
      </footer>
    </div>
  );
}