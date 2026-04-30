import { Link } from "react-router-dom";
import { UserCircle, ShieldCheck, AlertTriangle, ArrowRight } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

const Index = () => {
  return (
    <div className="bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 pt-24">
        {/* Hero Section */}
        <section className="relative h-[870px] flex items-center justify-center overflow-hidden bg-zinc-900">
          <div className="absolute inset-0 z-0">
            <img 
              className="w-full h-full object-cover grayscale opacity-60" 
              alt="Moody high-contrast interior of a vintage newspaper printing press room with soft atmospheric dust and warm overhead lighting" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAUZtIjaA08qNgZp89WFL_q4dIAgeoIPoMLYUnUpCtWCSQH8dmg3PyChautLN50oPZIMJxYcULR5zAER99fQ8r5VwWhbvS8vRcJcfCDRBeYkNGVl1stHRrtATFpMwaP-4yy15SToauHDO3I2VkqhHT134irbwM2GWTwG13gy_GUzrOmHV8qEoHzgJPm4nFG4B8Lo7xemFuKJfvOB-HWsv6cmVAY6UyzJto2aWTls--oJzCjPpzWhdUSmDHFeVt3j9QykbaU8y1MqKm_"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-zinc-50/20 via-zinc-900/40 to-zinc-900/80 dark:from-zinc-950/20 dark:via-black/40 dark:to-black/80"></div>
          </div>
          <div className="relative z-10 text-center px-6">
            <h1 className="text-white font-serif text-6xl md:text-8xl font-medium tracking-tighter mb-6">
              The Truth, Verified.
            </h1>
            <p className="text-zinc-200 font-sans text-xl md:text-2xl max-w-2xl mx-auto opacity-90 font-light italic">
              Restoring journalistic integrity through algorithmic rigor and human expertise.
            </p>
            <div className="mt-12">
              <Link to="/feed">
                <button className="bg-zinc-50 text-zinc-900 px-10 py-4 rounded-sm font-sans uppercase tracking-widest text-sm font-bold hover:bg-white transition-all shadow-xl">
                  Explore the Archive
                </button>
              </Link>
            </div>
          </div>
        </section>

        {/* Impact Statistics */}
        <section className="bg-zinc-100 dark:bg-zinc-900 shadow-inner py-20 px-8">
          <div className="max-w-screen-2xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
            <div className="flex flex-col border-l-2 border-zinc-300/30 dark:border-zinc-700/30 pl-6">
              <span className="font-serif text-5xl font-bold">1.2M</span>
              <span className="font-sans text-xs uppercase tracking-widest mt-2 text-zinc-600 dark:text-zinc-400">Articles Checked</span>
            </div>
            <div className="flex flex-col border-l-2 border-zinc-300/30 dark:border-zinc-700/30 pl-6">
              <span className="font-serif text-5xl font-bold">98%</span>
              <span className="font-sans text-xs uppercase tracking-widest mt-2 text-zinc-600 dark:text-zinc-400">Accuracy Rate</span>
            </div>
            <div className="flex flex-col border-l-2 border-zinc-300/30 dark:border-zinc-700/30 pl-6">
              <span className="font-serif text-5xl font-bold">24/7</span>
              <span className="font-sans text-xs uppercase tracking-widest mt-2 text-zinc-600 dark:text-zinc-400">Real-Time Monitoring</span>
            </div>
            <div className="flex flex-col border-l-2 border-zinc-300/30 dark:border-zinc-700/30 pl-6">
              <span className="font-serif text-5xl font-bold">50+</span>
              <span className="font-sans text-xs uppercase tracking-widest mt-2 text-zinc-600 dark:text-zinc-400">Global Partners</span>
            </div>
          </div>
        </section>

        {/* Featured Articles */}
        <section className="py-24 px-8 max-w-screen-2xl mx-auto">
          <div className="flex justify-between items-end mb-16">
            <div>
              <h2 className="font-serif text-4xl mb-2">The Intelligence Report</h2>
              <p className="text-zinc-600 dark:text-zinc-400 font-sans">Deep-dive investigations and verified global events.</p>
            </div>
            <Link to="/feed" className="text-slate-700 dark:text-slate-300 font-sans text-sm uppercase tracking-widest border-b border-slate-700/30 dark:border-slate-300/30 pb-1 hover:text-slate-900 dark:hover:text-white transition-colors">
              View All Records
            </Link>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            {/* Large Featured Card */}
            <div className="md:col-span-8 group relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-0 overflow-hidden shadow-sm">
              <div className="grid grid-cols-1 lg:grid-cols-2 h-full">
                <div className="relative h-64 lg:h-auto overflow-hidden">
                  <img 
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                    alt="Satellite view of earth with glowing data networks across continents in cool blue and white tones" 
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuBKtKsJZEwnbJrmuOL8RFLUefzEnBYuM-azbFMx3bbgsAv9KaI7j6VOLYxrd1l-SCk3Jm9XvNVITpoYng67V6HmGO_d1Wd50YI_ngY1qAyLRw6M8HJ66bQ4PfY40-AIxfwhTqsWE9oqdBQEgHZ9Pex2fQr6qtl2G4K7CizumkKnat6PrOByY073xa7P4X8nLFRBqyIOp-p_k1nRohyK2ixWfsXYcNk2FTxRnFxQuQEam51kT36TEZElPP3jmfzaXxqc8beeYiHan3N1"
                  />
                </div>
                <div className="p-10 flex flex-col justify-between bg-white dark:bg-black">
                  <div>
                    <div className="flex items-center gap-3 mb-6">
                      <span className="bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300 px-3 py-1 rounded-full text-[10px] font-bold font-sans uppercase tracking-tighter flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" /> Verified
                      </span>
                      <span className="text-zinc-600 dark:text-zinc-400 text-xs font-sans uppercase tracking-widest">Global Economy</span>
                    </div>
                    <h3 className="font-serif text-3xl mb-4 leading-tight">Decentralized Finance: The Truth Behind The Emerging Ledger War</h3>
                    <p className="text-zinc-600 dark:text-zinc-400 line-clamp-3 mb-6">Our investigative team spends three months auditing the primary claims of central banking stability versus algorithmic protocols.</p>
                  </div>
                  <div className="flex items-center justify-between text-xs font-sans text-zinc-500 uppercase tracking-widest">
                    <span>12 Min Read</span>
                    <span>Nov 14, 2024</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Side Cards */}
            <div className="md:col-span-4 flex flex-col gap-8">
              <div className="bg-white dark:bg-zinc-900 p-8 flex flex-col justify-between h-full border-l-4 border-green-600 dark:border-green-500 shadow-sm">
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300 px-2 py-0.5 rounded-full text-[9px] font-bold font-sans uppercase">
                      Verified
                    </span>
                    <span className="text-zinc-600 dark:text-zinc-400 text-[10px] font-sans uppercase tracking-widest">Climate</span>
                  </div>
                  <h3 className="font-serif text-xl mb-4">Arctic Melt Velocity: Verifying the Latest Polar Records</h3>
                  <p className="text-zinc-600 dark:text-zinc-400 text-sm line-clamp-2">Fact-checking the conflicting reports from the recent Oslo summit on permafrost levels.</p>
                </div>
                <Link to="/article/1" className="mt-6 text-sm font-bold flex items-center gap-2 hover:opacity-80">
                  Read Investigation <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              <div className="bg-white dark:bg-zinc-900 p-8 flex flex-col justify-between h-full border-l-4 border-red-600 dark:border-red-500 shadow-sm">
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300 px-2 py-0.5 rounded-full text-[9px] font-bold font-sans uppercase flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Disputed
                    </span>
                    <span className="text-zinc-600 dark:text-zinc-400 text-[10px] font-sans uppercase tracking-widest">Election</span>
                  </div>
                  <h3 className="font-serif text-xl mb-4">Misinformation Alert: Viral Audio Clip Lacks Authentic Metadata</h3>
                  <p className="text-zinc-600 dark:text-zinc-400 text-sm line-clamp-2">The Veritas Lab confirms deepfake origin for the widespread audio of Prime Minister J. Doe.</p>
                </div>
                <Link to="/article/2" className="mt-6 text-sm font-bold flex items-center gap-2 hover:opacity-80">
                  View Analysis <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* How it Works */}
        <section className="py-32 px-8 bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900 relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-zinc-800/20 dark:bg-zinc-400/20 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-green-800/10 dark:bg-green-600/10 rounded-full blur-3xl"></div>
          <div className="max-w-screen-2xl mx-auto relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
              <div className="lg:col-span-5">
                <h2 className="font-serif text-5xl mb-8 leading-tight">The Forensic Methodology of Modern Journalism</h2>
                <p className="text-zinc-300 dark:text-zinc-700 text-lg mb-10">
                  We believe that truth is not a destination, but a process. Our methodology combines rigorous evidentiary standards with cutting-edge digital forensics.
                </p>
                <ul className="space-y-8">
                  <li className="flex gap-6">
                    <span className="font-serif text-4xl text-zinc-600/40 dark:text-zinc-400/40">01</span>
                    <div>
                      <h4 className="font-serif text-xl mb-2">Ingestion &amp; Sourcing</h4>
                      <p className="text-zinc-400 dark:text-zinc-600 text-sm">Every lead is indexed and its source provenance verified using blockchain metadata tagging.</p>
                    </div>
                  </li>
                  <li className="flex gap-6">
                    <span className="font-serif text-4xl text-zinc-600/40 dark:text-zinc-400/40">02</span>
                    <div>
                      <h4 className="font-serif text-xl mb-2">Cross-Verification</h4>
                      <p className="text-zinc-400 dark:text-zinc-600 text-sm">Autonomous bots search millions of database entries to find corroborating or conflicting evidence.</p>
                    </div>
                  </li>
                  <li className="flex gap-6">
                    <span className="font-serif text-4xl text-zinc-600/40 dark:text-zinc-400/40">03</span>
                    <div>
                      <h4 className="font-serif text-xl mb-2">Expert Review</h4>
                      <p className="text-zinc-400 dark:text-zinc-600 text-sm">Human editors with subject-matter expertise perform the final forensic analysis.</p>
                    </div>
                  </li>
                </ul>
              </div>
              <div className="lg:col-span-7 relative h-[600px] hidden md:block">
                <div className="absolute top-0 right-0 w-4/5 h-[450px] bg-white/5 dark:bg-black/5 backdrop-blur-xl border border-white/10 dark:border-black/10 p-4 shadow-2xl">
                  <img 
                    className="w-full h-full object-cover grayscale opacity-90" 
                    alt="Abstract visualization of digital data flowing as glowing sparks and streams against a dark backdrop" 
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuCr6yX78o_H6LaDiFFd5U33Q6aNtKbUFXcU5_Xd5rIAf41Dz0DhyHRmC5zN-yBssjQSpvlosQxfsDNoA0l-d-Co_g36oChoVJAL7twEHqwrbeW41FmDFQN1yR01RDUlJYz-V1ZXfrPwd-mUCJteSBs83BmhvQK7uRgZRg2l0LDrYb2Oc1HNfErNor_REIDInc_d4ta1oy-kUF3laCtqxPvg0FO3whSQCfaTILehVlj1PoQOXDXydtMJdbf_aFBtRQvaesLlX6gxmE3J"
                  />
                </div>
                <div className="absolute bottom-0 left-0 w-3/5 h-[300px] bg-zinc-800 dark:bg-zinc-200 p-12 flex flex-col justify-center">
                  <h4 className="font-serif text-2xl text-zinc-100 dark:text-zinc-900 mb-4 italic">
                    "Neutrality is not enough. We strive for accuracy that can withstand the test of time."
                  </h4>
                  <p className="font-sans text-xs uppercase tracking-widest text-zinc-400 dark:text-zinc-600">
                    Erik Thorne, Editor-in-Chief
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 px-8 text-center bg-white dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-900">
          <div className="max-w-4xl mx-auto">
            <span className="font-sans text-xs uppercase tracking-[0.3em] text-zinc-500 mb-6 block">
              Be Part of the Record
            </span>
            <h2 className="font-serif text-5xl mb-8">Join the Truth Movement</h2>
            <p className="text-zinc-600 dark:text-zinc-400 text-lg mb-12 max-w-2xl mx-auto">
              Subscribe to our weekly intelligence briefing and get verified reports delivered directly to your inbox. No noise. No bias. Just the facts.
            </p>
            <div className="flex flex-col md:flex-row gap-4 justify-center items-center">
              <input 
                className="border-b-2 border-zinc-300 dark:border-zinc-700 bg-transparent py-4 px-2 w-full md:w-96 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100 transition-colors font-sans placeholder:text-zinc-400" 
                placeholder="Your professional email" 
                type="email"
              />
              <button className="bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900 px-12 py-4 font-sans uppercase tracking-widest text-sm font-bold hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all">
                Secure Access
              </button>
            </div>
            <p className="mt-8 text-xs text-zinc-500 font-sans">
              Join 200,000+ informed subscribers. Unsubscribe at any time.
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Index;
