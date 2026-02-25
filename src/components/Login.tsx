import { useState, useEffect } from 'react';
import { User } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, ChevronDown, Search, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { countries } from '../constants';
import { getFirebaseAuth } from '../firebase';
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';

interface LoginProps {
  onLogin: (user: User) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [selectedCountry, setSelectedCountry] = useState(countries.find(c => c.name === 'Bangladesh') || countries[0]);
  const [showCountrySelector, setShowCountrySelector] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    try {
      if (!(window as any).recaptchaVerifier) {
        const auth = getFirebaseAuth();
        (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          size: 'invisible',
          callback: () => {
            console.log('Recaptcha resolved');
          }
        });
      }
    } catch (err: any) {
      console.error("Firebase initialization failed:", err.message);
      setError("Firebase is not configured. Please add your Firebase API keys to the environment variables.");
    }
  }, []);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber.trim()) return;

    setLoading(true);
    setError('');
    const fullNumber = `${selectedCountry.code}${phoneNumber}`;

    try {
      const auth = getFirebaseAuth();
      const appVerifier = (window as any).recaptchaVerifier;
      if (!appVerifier) {
        throw new Error("Recaptcha verifier not initialized. Check your Firebase configuration.");
      }
      const result = await signInWithPhoneNumber(auth, fullNumber, appVerifier);
      setConfirmationResult(result);
      setStep('otp');
    } catch (err: any) {
      console.error("Firebase Error:", err.code, err.message);
      
      let errorMsg = err.message || 'OTP পাঠাতে ব্যর্থ হয়েছে।';
      if (err.code === 'auth/configuration-not-found') {
        errorMsg = "ফায়ারবেস কনসোলে ফোন অথেনটিকেশন চালু করা নেই।";
      } else if (err.code === 'auth/billing-not-enabled') {
        errorMsg = "ফায়ারবেস SMS এর জন্য বিলিং অ্যাকাউন্ট (Blaze plan) প্রয়োজন।";
      } else if (err.code === 'auth/operation-not-allowed') {
        errorMsg = "আপনার অঞ্চলের জন্য ফায়ারবেসে SMS অনুমতি দেওয়া নেই।";
      } else if (err.code === 'auth/too-many-requests') {
        errorMsg = "অতিরিক্ত রিকোয়েস্ট পাঠানো হয়েছে। ফায়ারবেস সাময়িকভাবে SMS ব্লক করেছে। দয়া করে কিছুক্ষণ অপেক্ষা করুন অথবা সরাসরি লগইন করুন।";
      }
      
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = () => {
    const demoUser: User = {
      id: 'demo-' + Math.random().toString(36).substr(2, 9),
      username: `Demo User ${Math.floor(Math.random() * 1000)}`,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=demo-${Math.random()}`,
    };
    onLogin(demoUser);
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otp.join('');
    if (code.length !== 6 || !confirmationResult) return;

    setLoading(true);
    setError('');

    try {
      const result = await confirmationResult.confirm(code);
      const firebaseUser = result.user;
      
      const newUser: User = {
        id: firebaseUser.uid,
        username: firebaseUser.phoneNumber || 'User',
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${firebaseUser.uid}`,
      };
      onLogin(newUser);
    } catch (err: any) {
      console.error(err);
      setError('Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const filteredCountries = countries.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.code.includes(searchQuery)
  );

  return (
    <div className="min-h-screen bg-[#f0f2f5] flex flex-col items-center font-sans">
      {/* Top Green Bar */}
      <div className="w-full h-[220px] bg-[#00a884] absolute top-0 left-0 z-0"></div>

      <div className="z-10 mt-12 w-full max-w-[450px] px-4">
        <div className="flex items-center gap-4 mb-8 text-white">
          <div className="bg-white p-2 rounded-full text-[#00a884]">
            <MessageSquare size={32} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight uppercase">Alapio</h1>
        </div>

        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-white p-8 rounded-sm shadow-lg w-full"
        >
          <AnimatePresence mode="wait">
            {step === 'phone' ? (
              <motion.div
                key="phone-step"
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 20, opacity: 0 }}
              >
                <h2 className="text-xl font-medium text-gray-800 mb-2">Enter phone number</h2>
                <p className="text-sm text-gray-500 mb-8">
                  Alapio will need to verify your phone number. Carrier charges may apply.
                </p>

                <form onSubmit={handleSendOtp} className="space-y-6">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowCountrySelector(true)}
                      className="w-full flex items-center justify-between border-b-2 border-[#00a884] py-2 text-center focus:outline-none"
                    >
                      <span className="text-gray-800">{selectedCountry.name}</span>
                      <ChevronDown size={20} className="text-gray-400" />
                    </button>
                  </div>

                  <div className="flex gap-4 border-b-2 border-[#00a884] items-center">
                    <span className="text-gray-500 font-medium py-2 min-w-[50px] text-center border-r border-gray-200">
                      {selectedCountry.code}
                    </span>
                    <input
                      type="tel"
                      placeholder="Phone number"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                      className="flex-1 py-2 focus:outline-none text-lg tracking-wider"
                      autoFocus
                    />
                  </div>

                  {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-sm mb-4">
                      <p className="text-red-700 text-xs font-medium mb-2 leading-relaxed">⚠️ {error}</p>
                      <div className="flex flex-col gap-2">
                        <button 
                          type="button"
                          onClick={() => {
                            setError('');
                            setStep('otp');
                            // Mock confirmation result for simulation
                            setConfirmationResult({
                              confirm: async (code: string) => {
                                if (code === '123456') {
                                  return {
                                    user: {
                                      uid: 'simulated-user-' + phoneNumber,
                                      phoneNumber: `${selectedCountry.code}${phoneNumber}`,
                                    }
                                  } as any;
                                }
                                throw new Error('Invalid code');
                              }
                            } as any);
                          }}
                          className="w-full bg-[#00a884] text-white py-2 rounded-sm text-xs font-bold hover:bg-[#008f70] transition-colors shadow-sm"
                        >
                          OTP স্ক্রিনটি দেখুন (সিমুলেশন মোড)
                        </button>
                        <button 
                          type="button"
                          onClick={() => {
                            if (phoneNumber) {
                              const directUser: User = {
                                id: 'user-' + phoneNumber,
                                username: `${selectedCountry.code} ${phoneNumber}`,
                                avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${phoneNumber}`,
                              };
                              onLogin(directUser);
                            } else {
                              handleDemoLogin();
                            }
                          }}
                          className="w-full bg-gray-600 text-white py-2 rounded-sm text-xs font-bold hover:bg-gray-700 transition-colors shadow-sm"
                        >
                          সরাসরি লগইন করুন (SMS ছাড়া)
                        </button>
                      </div>
                    </div>
                  )}

                  <div id="recaptcha-container"></div>

                  <div className="pt-4 flex flex-col items-center gap-4">
                    <button
                      type="submit"
                      disabled={loading || !phoneNumber}
                      className="bg-[#00a884] text-white px-8 py-2.5 rounded-sm font-medium hover:bg-[#008f70] transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed uppercase text-sm w-full"
                    >
                      {loading ? 'Sending SMS...' : 'Next'}
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => {
                        if (!phoneNumber) {
                          setError("Please enter a phone number first.");
                          return;
                        }
                        const directUser: User = {
                          id: 'user-' + phoneNumber,
                          username: `${selectedCountry.code} ${phoneNumber}`,
                          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${phoneNumber}`,
                        };
                        onLogin(directUser);
                      }}
                      className="text-[#00a884] font-bold py-2 rounded-sm hover:bg-[#00a884]/5 transition-colors text-xs w-full border border-dashed border-[#00a884]"
                    >
                      Direct Login (No SMS)
                    </button>
                  </div>
                </form>
              </motion.div>
            ) : (
              <motion.div
                key="otp-step"
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
              >
                <div className="flex items-center gap-2 mb-6">
                  <button onClick={() => setStep('phone')} className="text-[#00a884] hover:bg-gray-100 p-1 rounded-full">
                    <ArrowLeft size={20} />
                  </button>
                  <h2 className="text-xl font-medium text-gray-800">Verify {selectedCountry.code} {phoneNumber}</h2>
                </div>
                
                <p className="text-sm text-gray-500 mb-8">
                  Waiting to automatically detect an SMS sent to {selectedCountry.code} {phoneNumber}. <span className="text-[#00a884] cursor-pointer">Wrong number?</span>
                </p>

                <form onSubmit={handleVerifyOtp} className="space-y-8">
                  <div className="flex justify-between gap-2">
                    {otp.map((digit, i) => (
                      <input
                        key={i}
                        id={`otp-${i}`}
                        type="text"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(i, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Backspace' && !digit && i > 0) {
                            document.getElementById(`otp-${i - 1}`)?.focus();
                          }
                        }}
                        className="w-12 h-12 border-b-2 border-gray-300 focus:border-[#00a884] text-center text-2xl font-bold focus:outline-none transition-colors"
                      />
                    ))}
                  </div>

                  {error && <p className="text-red-500 text-xs text-center">{error}</p>}

                  <div className="flex flex-col items-center gap-4">
                    <button
                      type="submit"
                      disabled={loading || otp.some(d => !d)}
                      className="bg-[#00a884] text-white px-8 py-2.5 rounded-sm font-medium hover:bg-[#008f70] transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed uppercase text-sm"
                    >
                      {loading ? 'Verifying...' : 'Verify'}
                    </button>
                    <button type="button" className="text-[#00a884] text-sm font-medium hover:underline">
                      Resend SMS
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-6 bg-white/50 backdrop-blur-sm p-4 rounded-sm border border-white/20"
        >
          <h4 className="text-xs font-bold text-gray-700 mb-2 uppercase flex items-center gap-2">
            <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
            Testing Tips
          </h4>
          <p className="text-[11px] text-gray-600 leading-relaxed">
            If you see billing errors, you can use <b>Firebase Test Numbers</b> for free. 
            Add a number like <code className="bg-gray-200 px-1">+8801700000000</code> in your Firebase Console 
            with a fixed code like <code className="bg-gray-200 px-1">123456</code>.
          </p>
        </motion.div>

        <p className="text-gray-500 text-center mt-8 text-xs">
          You must be at least 13 years old to register. Learn how Alapio works with the <span className="text-[#00a884] cursor-pointer">Meta Companies</span>.
        </p>
      </div>

      {/* Country Selector Modal */}
      <AnimatePresence>
        {showCountrySelector && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-[400px] h-[600px] rounded-lg shadow-2xl flex flex-col overflow-hidden"
            >
              <div className="p-4 bg-[#00a884] text-white flex items-center gap-4">
                <button onClick={() => setShowCountrySelector(false)}>
                  <ArrowLeft size={24} />
                </button>
                <h3 className="text-lg font-medium">Choose a country</h3>
              </div>
              
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-center bg-gray-100 rounded-lg px-3 py-2">
                  <Search size={18} className="text-gray-400 mr-2" />
                  <input
                    type="text"
                    placeholder="Search countries"
                    className="bg-transparent border-none focus:outline-none text-sm w-full"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                {filteredCountries.map((country) => (
                  <button
                    key={country.name}
                    onClick={() => {
                      setSelectedCountry(country);
                      setShowCountrySelector(false);
                    }}
                    className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 border-b border-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-2xl">{country.flag}</span>
                      <span className="text-gray-800">{country.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-gray-400 text-sm">{country.code}</span>
                      {selectedCountry.name === country.name && (
                        <CheckCircle2 size={20} className="text-[#00a884]" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
