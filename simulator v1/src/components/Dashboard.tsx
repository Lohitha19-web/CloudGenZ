import React, { useState, useEffect, useRef } from 'react';
import { CloudLightning, FolderPlus, Box, Boxes, Inbox, X, FolderOpen, UploadCloud, Archive, FileText, Image as ImageIcon, Video, FileSpreadsheet, FileArchive, HardDrive, Trash2, Trash, DownloadCloud, CheckCircle, Eye, Download, Brain, RotateCcw, Bot, Send, LogOut, File, User, CircleAlert } from 'lucide-react';
import { dbAdd, dbGetByIndex, dbDelete, dbGet, STORE_DOCS } from '../lib/db';

interface DashboardProps {
  user: any;
  onLogout: () => void;
}

interface S3File {
  name: string;
  size: string;
  type: string;
  data: string;
}

interface ToastMessage {
  msg: string;
  icon: React.ReactNode;
  color: string;
}

export default function Dashboard({ user, onLogout }: DashboardProps) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [buckets, setBuckets] = useState<Record<string, S3File[]>>(() => {
    const saved = localStorage.getItem(`cg_buckets_${user.email}`);
    return saved ? JSON.parse(saved) : {};
  });
  const [selectedBucket, setSelectedBucket] = useState<string | null>(null);
  const [newBucketName, setNewBucketName] = useState('');
  const [cachedDocs, setCachedDocs] = useState<any[]>([]);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'ai', content: string | React.ReactNode }[]>([
    {
      role: 'ai',
      content: (
        <>
          Welcome! 🗄️ I'm your <strong>AWS Cloud Assistant</strong>.<br /><br />
          Ask me anything about S3, IAM, cloud computing, regions, and more.<br /><br />
          <ul className="list-disc list-inside mt-2 text-teal-400 space-y-1 text-xs">
            <li>"What is Amazon S3?"</li>
            <li>"How does S3 handle storage?"</li>
            <li>"Explain AWS IAM security"</li>
          </ul>
        </>
      )
    }
  ]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(`cg_buckets_${user.email}`, JSON.stringify(buckets));
  }, [buckets, user.email]);

  useEffect(() => {
    loadCachedDocs();
  }, [user.email]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const showToast = (msg: string, icon: React.ReactNode, color: string) => {
    setToast({ msg, icon, color });
    setTimeout(() => setToast(null), 3000);
  };

  const loadCachedDocs = async () => {
    try {
      const docs = await dbGetByIndex(STORE_DOCS, 'owner', user.email);
      docs.sort((a: any, b: any) => b.savedAt - a.savedAt);
      setCachedDocs(docs);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateBucket = (e: React.FormEvent) => {
    e.preventDefault();
    const raw = newBucketName.trim();
    if (!raw) return showToast('Please enter a bucket name.', <CircleAlert size={16} />, 'text-rose-400');
    
    const nameCleaned = raw.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9.-]/g, '');
    if (!nameCleaned) return showToast('Invalid name. Use letters, numbers or hyphens.', <CircleAlert size={16} />, 'text-rose-400');
    if (buckets[nameCleaned]) return showToast('Bucket name already exists!', <CircleAlert size={16} />, 'text-rose-400');
    
    setBuckets(prev => ({ ...prev, [nameCleaned]: [] }));
    setSelectedBucket(nameCleaned);
    setNewBucketName('');
    showToast(`Bucket "s3://${nameCleaned}" created!`, <Box size={16} />, 'text-cyan-400');
  };

  const handleDeleteBucket = (name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Delete bucket "${name}" and all its files?`)) return;
    
    const newBuckets = { ...buckets };
    delete newBuckets[name];
    setBuckets(newBuckets);
    if (selectedBucket === name) setSelectedBucket(null);
    showToast('Bucket deleted.', <Trash size={16} />, 'text-rose-400');
  };

  const handleUploadObject = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    if (!input.files || input.files.length === 0 || !selectedBucket) return;
    const file = input.files[0];

    let sizeStr = '< 1 KB';
    if (file.size > 1024 * 1024) sizeStr = (file.size / (1024 * 1024)).toFixed(1) + ' MB';
    else if (file.size > 1024) sizeStr = (file.size / 1024).toFixed(1) + ' KB';

    const reader = new FileReader();
    reader.onload = (ev) => {
      const data = ev.target?.result as string;
      setBuckets(prev => ({
        ...prev,
        [selectedBucket]: [
          ...prev[selectedBucket],
          { name: file.name, size: sizeStr, type: file.type, data }
        ]
      }));
      if (fileInputRef.current) fileInputRef.current.value = '';
      showToast(`"${file.name}" uploaded!`, <UploadCloud size={16} />, 'text-teal-400');
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteObject = (idx: number) => {
    if (!selectedBucket) return;
    const file = buckets[selectedBucket][idx];
    const updatedBucketFiles = [...buckets[selectedBucket]];
    updatedBucketFiles.splice(idx, 1);
    
    setBuckets(prev => ({ ...prev, [selectedBucket]: updatedBucketFiles }));
    showToast(`"${file.name}" removed from bucket.`, <Trash size={16} />, 'text-rose-400');
  };

  const handleSaveOffline = async (file: S3File) => {
    if (!selectedBucket) return;
    const alreadyCached = cachedDocs.find(d => d.name === file.name && d.bucket === selectedBucket);
    if (alreadyCached) {
      showToast(`"${file.name}" is already saved offline!`, <Info size={16} />, 'text-amber-400');
      return;
    }

    try {
      await dbAdd(STORE_DOCS, {
        owner: user.email,
        bucket: selectedBucket,
        name: file.name,
        size: file.size,
        type: file.type,
        data: file.data,
        savedAt: Date.now()
      });
      showToast(`"${file.name}" saved for offline access!`, <HardDrive size={16} />, 'text-amber-400');
      loadCachedDocs();
    } catch (e) {
      showToast('Error saving document offline.', <CircleAlert size={16} />, 'text-rose-400');
    }
  };

  const handleOpenCachedDoc = async (doc: any) => {
    const openable = /\.(jpg|jpeg|png|gif|svg|webp|pdf)$/i.test(doc.name);
    if (openable && doc.data) {
      const win = window.open();
      if (win) {
        win.document.write(`<html><head><title>${doc.name}</title></head><body style="margin:0;background:#000;">
            <img src="${doc.data}" style="max-width:100%;display:block;" onerror="this.style.display='none'">
            <embed src="${doc.data}" width="100%" height="100%" style="position:fixed;top:0;left:0;min-height:100vh;">
        </body></html>`);
      }
    } else {
      handleDownloadCachedDoc(doc);
    }
    showToast(`Opening "${doc.name}"...`, <Eye size={16} />, 'text-teal-400');
  };

  const handleDownloadCachedDoc = (doc: any) => {
    if (!doc.data) return;
    const a = document.createElement('a');
    a.href = doc.data;
    a.download = doc.name;
    a.click();
    showToast(`Downloading "${doc.name}"...`, <Download size={16} />, 'text-cyan-400');
  };

  const handleDeleteCachedDoc = async (id: number, name: string) => {
    try {
      await dbDelete(STORE_DOCS, id);
      loadCachedDocs();
      showToast(`"${name}" removed from offline library.`, <Trash size={16} />, 'text-rose-400');
    } catch (e) {
      showToast('Error removing document.', <CircleAlert size={16} />, 'text-rose-400');
    }
  };

  const handleClearAllCached = async () => {
    if (cachedDocs.length === 0) return;
    if (!window.confirm(`Remove all ${cachedDocs.length} cached documents from your offline library?`)) return;
    try {
      for (const doc of cachedDocs) {
        await dbDelete(STORE_DOCS, doc.id);
      }
      loadCachedDocs();
      showToast('Offline library cleared.', <Trash size={16} />, 'text-rose-400');
    } catch (e) {
      showToast('Error clearing documents.', <CircleAlert size={16} />, 'text-rose-400');
    }
  };

  const processAWSKnowledgeBase = (q: string) => {
    const t = q.toLowerCase();
    if (t.includes('s3') || t.includes('bucket') || t.includes('storage') || t.includes('object'))
      return "📦 <strong>Amazon S3 (Simple Storage Service)</strong> is an object storage service offering industry-leading scalability, data availability, security, and performance.<br><br>Data is organized into <strong>Buckets</strong>. Each object stored has a unique key, data payload, and metadata. S3 guarantees <strong>99.999999999% (11 nines)</strong> durability!";
    if (t.includes('offline') || t.includes('cache') || t.includes('indexeddb'))
      return "🗄️ <strong>Offline Document Access</strong> in CloudGenz uses <strong>IndexedDB</strong> — a browser-native database that stores files directly on your device.<br><br>Once saved, your docs are accessible even with <strong>no internet</strong>. Just go to the <em>Offline Library</em> section and click Open or Download.";
    if (t.includes('iam') || t.includes('security') || t.includes('permission'))
      return "🔐 <strong>AWS IAM (Identity & Access Management)</strong> controls who can do what inside AWS.<br><br>Key principle: <em>Least Privilege</em> — grant only the permissions absolutely needed. Use <strong>Roles</strong> for services, <strong>Policies</strong> for rules, and <strong>MFA</strong> for extra account security.";
    if (t.includes('region') || t.includes('zone') || t.includes('az') || t.includes('availability'))
      return "🌍 <strong>AWS Global Infrastructure:</strong><br><br>• <strong>Regions</strong> — Geographic clusters of data centers (e.g., ap-south-1 = Mumbai)<br>• <strong>Availability Zones (AZs)</strong> — Isolated facilities within a Region, connected via high-speed fiber<br><br>Deploying across multiple AZs = high availability and fault tolerance.";
    if (t.includes('cloud') || t.includes('aws') || t.includes('amazon'))
      return "☁️ <strong>Cloud Computing</strong> is on-demand delivery of IT resources (compute, storage, databases) over the internet with pay-as-you-go pricing.<br><br><strong>AWS</strong> (Amazon Web Services) is the world's most comprehensive cloud platform with 200+ services from data centers globally.";
    if (t.includes('vpc') || t.includes('network') || t.includes('subnet'))
      return "🔗 <strong>Amazon VPC (Virtual Private Cloud)</strong> lets you launch AWS resources in a logically isolated virtual network you define.<br><br>Control IP ranges, subnets, route tables, and gateways. Think of it as your <em>private data center inside AWS</em>.";
    if (t.includes('ec2') || t.includes('compute') || t.includes('server') || t.includes('instance'))
      return "🖥️ <strong>Amazon EC2</strong> provides resizable virtual servers (instances) in the cloud. Choose OS, CPU, RAM, and storage to match your workload.<br><br>Common types: <strong>t3.micro</strong> (general use), <strong>c6i</strong> (compute-heavy), <strong>r6i</strong> (memory-intensive), <strong>p4</strong> (GPU/ML workloads).";
    if (t.includes('rds') || t.includes('database') || t.includes('sql'))
      return "🗃️ <strong>Amazon RDS (Relational Database Service)</strong> makes it easy to set up, operate, and scale a relational database in the cloud.<br><br>Supports MySQL, PostgreSQL, MariaDB, Oracle, SQL Server, and Amazon Aurora. Automated backups, patching, and failover included!";
    return "🤖 Great question! While I specialize in AWS cloud topics, I might not have a specific answer for that. Try asking about <strong>S3</strong>, <strong>IAM</strong>, <strong>VPC</strong>, <strong>Regions</strong>, or <strong>offline document access</strong> in CloudGenz!";
  };

  const handleChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    
    setChatMessages(prev => [...prev, { role: 'user', content: chatInput }]);
    const query = chatInput;
    setChatInput('');
    
    setTimeout(() => {
      setChatMessages(prev => [...prev, { role: 'ai', content: <span dangerouslySetInnerHTML={{ __html: processAWSKnowledgeBase(query) }} /> }]);
    }, 500);
  };

  const getFileIcon = (filename: string, className = "text-slate-400") => {
    if (/\.(jpg|jpeg|png|gif|svg|webp)$/i.test(filename)) return <ImageIcon className={`flex-shrink-0 ${className} text-emerald-400`} />;
    if (/\.(mp4|mkv|mov|avi)$/i.test(filename)) return <Video className={`flex-shrink-0 ${className} text-amber-400`} />;
    if (/\.(pdf|doc|docx|txt|ppt|pptx)$/i.test(filename)) return <FileText className={`flex-shrink-0 ${className} text-cyan-400`} />;
    if (/\.(xls|xlsx|csv)$/i.test(filename)) return <FileSpreadsheet className={`flex-shrink-0 ${className} text-green-400`} />;
    if (/\.(zip|rar|7z)$/i.test(filename)) return <FileArchive className={`flex-shrink-0 ${className} text-purple-400`} />;
    return <FileText className={`flex-shrink-0 ${className}`} />;
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-900 animate-fade-in-up">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700/80 px-6 py-3.5 flex justify-between items-center shadow-lg">
        <div className="flex items-center space-x-3">
          <div className="bg-gradient-to-br from-teal-500 to-cyan-500 text-slate-950 p-2 rounded-xl shadow-md shadow-teal-500/20">
            <CloudLightning size={24} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-lg font-black text-white tracking-tight">CloudGenz Platform</h1>
            <p className="text-[11px] text-teal-400 font-medium">Interactive Student Sandbox • S3 Storage</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className={`text-xs font-bold px-3 py-1.5 rounded-lg flex items-center space-x-1.5 ${isOnline ? 'online-badge' : 'offline-badge'}`}>
            <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${isOnline ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
            <span>{isOnline ? 'Online' : 'Offline'}</span>
          </div>

          <div className="hidden sm:flex items-center space-x-2 text-sm bg-slate-950 px-3 py-2 rounded-lg border border-slate-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            <span className="text-slate-300 text-xs font-medium">Sandbox <strong className="text-emerald-400">Active</strong></span>
          </div>

          <div className="flex items-center space-x-2 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2">
            <div className="bg-gradient-to-br from-teal-500 to-cyan-500 text-slate-950 font-black w-7 h-7 rounded-lg flex items-center justify-center text-xs">
              {user.firstName?.[0]?.toUpperCase()}{user.lastName?.[0]?.toUpperCase()}
            </div>
            <span className="text-xs text-slate-300 font-semibold hidden sm:block">{user.firstName}</span>
            <button onClick={onLogout} className="text-slate-500 hover:text-rose-400 transition-colors ml-1 cursor-pointer" title="Sign Out">
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 p-6 max-w-[1700px] w-full mx-auto">
        <div className="lg:col-span-2 flex flex-col space-y-6">
          
          {/* S3 Bucket Creator */}
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-cyan-500 to-blue-500"></div>
            <div className="mb-4">
              <h2 className="text-lg font-bold text-white flex items-center">
                <FolderPlus size={18} className="text-cyan-400 mr-2" /> Create S3 Bucket
              </h2>
              <p className="text-xs text-slate-400 mt-1">S3 buckets must have globally unique naming parameters. Create a storage namespace instantly.</p>
            </div>
            <form onSubmit={handleCreateBucket} className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <span className="absolute left-4 top-3.5 text-slate-500 text-sm font-mono select-none">s3://</span>
                <input type="text" required value={newBucketName} onChange={e => setNewBucketName(e.target.value)} placeholder="my-unique-student-bucket" className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-12 pr-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all text-sm font-mono" />
              </div>
              <button type="submit" className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-slate-950 font-bold px-6 py-3 rounded-xl shadow-lg shadow-cyan-500/10 active:scale-[0.98] transition-all flex items-center justify-center space-x-2 cursor-pointer whitespace-nowrap">
                <Box size={16} /> <span>Create Bucket</span>
              </button>
            </form>
          </div>

          {/* S3 Explorer */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 shadow-xl flex flex-col min-h-[320px]">
              <h3 className="text-xs font-bold text-slate-300 mb-3 uppercase tracking-wider flex items-center">
                <Boxes size={14} className="mr-2 text-slate-400" /> Active Buckets
              </h3>
              
              {Object.keys(buckets).length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-4 border border-dashed border-slate-700 rounded-xl bg-slate-950/20">
                  <Inbox size={24} className="text-slate-600 mb-2" />
                  <span className="text-xs text-slate-500">No buckets yet.</span>
                </div>
              ) : (
                <ul className="space-y-2 flex-1 overflow-y-auto max-h-[380px] pr-1">
                  {Object.keys(buckets).map(name => {
                    const isActive = selectedBucket === name;
                    return (
                      <li key={name} onClick={() => setSelectedBucket(name)} className={`p-3 rounded-xl border transition-all cursor-pointer flex justify-between items-center ${isActive ? 'bg-cyan-500/10 border-cyan-500 text-white font-semibold' : 'bg-slate-950/40 border-slate-700/60 text-slate-400 hover:text-slate-200 hover:bg-slate-950/80'}`}>
                        <div className="flex items-center min-w-0 pr-2">
                          <Box size={14} className={`mr-2.5 flex-shrink-0 ${isActive ? 'text-cyan-400' : 'text-slate-500'}`} />
                          <span className="font-mono text-xs truncate">{name}</span>
                        </div>
                        <div className="flex items-center space-x-1.5">
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-700/60 font-mono">{buckets[name].length}</span>
                          <button onClick={(e) => handleDeleteBucket(name, e)} className="text-slate-600 hover:text-rose-400 transition-colors p-0.5">
                            <X size={12} />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 shadow-xl md:col-span-2 flex flex-col min-h-[380px]">
              <div className="flex justify-between items-center mb-4 border-b border-slate-700/60 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center">
                    <FolderOpen size={16} className="mr-2 text-cyan-400" /> Object File Explorer
                  </h3>
                  <p className="text-xs font-mono text-slate-400 mt-0.5">
                    Target: {selectedBucket ? <span className="text-cyan-400 font-semibold">s3://{selectedBucket}/</span> : <span className="text-slate-500">Select or create a bucket</span>}
                  </p>
                </div>
                {selectedBucket && (
                  <label className="bg-slate-950 hover:bg-slate-900 border border-slate-700 text-teal-400 text-xs font-bold px-3 py-2 rounded-xl transition-all cursor-pointer flex items-center space-x-1.5">
                    <UploadCloud size={14} />
                    <span>Upload Doc</span>
                    <input type="file" ref={fileInputRef} onChange={handleUploadObject} className="hidden" accept=".pdf,.doc,.docx,.txt,.ppt,.pptx,.xls,.xlsx,.png,.jpg,.jpeg,.zip,.mp4" />
                  </label>
                )}
              </div>

              {!selectedBucket || buckets[selectedBucket].length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-slate-950/10 border border-dashed border-slate-700 rounded-xl">
                  <Archive size={32} className="text-slate-600 mb-3 animate-pulse-slow" />
                  <p className="text-xs text-slate-400">{selectedBucket ? 'Bucket is empty. Upload files to get started.' : 'Select a bucket to view and manage your documents.'}</p>
                </div>
              ) : (
                <div className="flex-1 flex flex-col">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 overflow-y-auto max-h-[310px] p-1 pr-2">
                    {buckets[selectedBucket].map((file, idx) => (
                      <div key={idx} className="file-card rounded-xl p-3 flex flex-col justify-between group">
                        <div className="flex items-start space-x-2.5 min-w-0">
                          {getFileIcon(file.name, "mt-0.5")}
                          <div className="min-w-0 flex-1">
                            <h4 className="text-xs font-medium text-slate-200 truncate font-mono" title={file.name}>{file.name}</h4>
                            <span className="text-[10px] text-slate-500 font-mono block mt-0.5">{file.size}</span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center mt-3 pt-2 border-t border-slate-800 gap-1">
                          <button onClick={() => handleSaveOffline(file)} className="flex-1 flex items-center justify-center text-[10px] font-bold text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 px-2 py-1 rounded-lg transition-all cursor-pointer">
                            <HardDrive size={10} className="mr-1" /> Save Offline
                          </button>
                          <button onClick={() => handleDeleteObject(idx)} className="text-rose-400 hover:text-rose-300 bg-rose-500/10 border border-rose-500/20 p-1.5 flex items-center justify-center rounded-lg transition-all cursor-pointer opacity-0 group-hover:opacity-100">
                            <Trash size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* OFFLINE LIBRARY */}
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-amber-500 to-orange-500"></div>

            <div className="flex items-start justify-between mb-5">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center">
                  <HardDrive size={18} className="text-amber-400 mr-2" /> My Offline Document Library
                </h2>
                <p className="text-xs text-slate-400 mt-1">Files saved here are stored in your browser — accessible anytime, even without internet.</p>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs bg-amber-500/10 border border-amber-500/25 text-amber-400 font-bold px-3 py-1 rounded-lg">{cachedDocs.length} cached</span>
                <button onClick={handleClearAllCached} className="text-xs flex items-center text-slate-500 hover:text-rose-400 border border-slate-700 hover:border-rose-500/30 px-3 py-1.5 rounded-lg transition-all cursor-pointer">
                  <Trash size={12} className="mr-1" /> Clear All
                </button>
              </div>
            </div>

            {!isOnline && (
              <div className="mb-4 offline-badge text-xs font-medium px-4 py-2.5 rounded-xl flex items-center space-x-2">
                <CircleAlert size={14} />
                <span>You're offline. You can still view and download your cached documents below.</span>
              </div>
            )}

            {cachedDocs.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center p-8 border border-dashed border-slate-700 rounded-xl bg-slate-950/20">
                <DownloadCloud size={32} className="text-slate-600 mb-3 animate-pulse-slow" />
                <p className="text-sm text-slate-400 font-medium mb-1">No documents cached yet</p>
                <p className="text-xs text-slate-500">Upload files to your S3 bucket and click <strong className="text-amber-400">Save Offline</strong> to keep them here.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {cachedDocs.map(doc => {
                  const savedDate = new Date(doc.savedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
                  return (
                    <div key={doc.id} className="file-card rounded-xl p-3.5 flex flex-col justify-between group">
                      <div className="flex items-start space-x-2.5 min-w-0 mb-3">
                        {getFileIcon(doc.name, "mt-0.5")}
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs font-semibold text-slate-200 truncate font-mono leading-tight" title={doc.name}>{doc.name}</h4>
                          <span className="text-[10px] text-slate-500 font-mono block mt-0.5">{doc.size}</span>
                          <span className="cached-badge inline-flex items-center px-1.5 py-0.5 rounded mt-1">
                            <CheckCircle size={8} className="mr-1" /> OFFLINE READY
                          </span>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <div className="text-[9px] text-slate-600 font-mono">s3://{doc.bucket} • {savedDate}</div>
                        <div className="flex gap-1.5">
                          <button onClick={() => handleOpenCachedDoc(doc)} className="flex-1 flex items-center justify-center text-[10px] font-bold text-teal-400 hover:text-teal-300 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/20 px-2 py-1.5 rounded-lg transition-all cursor-pointer">
                            <Eye size={10} className="mr-1" /> Open
                          </button>
                          <button onClick={() => handleDownloadCachedDoc(doc)} className="flex-1 flex items-center justify-center text-[10px] font-bold text-cyan-400 hover:text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 px-2 py-1.5 rounded-lg transition-all cursor-pointer">
                            <Download size={10} className="mr-1" /> Save
                          </button>
                          <button onClick={() => handleDeleteCachedDoc(doc.id, doc.name)} className="text-[10px] flex items-center justify-center text-rose-400 hover:text-rose-300 bg-rose-500/10 border border-rose-500/20 p-1.5 rounded-lg transition-all cursor-pointer opacity-0 group-hover:opacity-100">
                            <Trash size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Chatbot */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl flex flex-col shadow-xl min-h-[550px] lg:h-[calc(100vh-100px)] lg:sticky lg:top-6 overflow-hidden">
          <div className="bg-slate-950/80 border-b border-slate-700 p-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-teal-400 to-cyan-400 flex items-center justify-center text-slate-950 font-black shadow-md">
                <Brain size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">AWS Knowledge Assistant</h3>
                <p className="text-[11px] text-teal-400 flex items-center">
                  <span className="w-1.5 h-1.5 bg-teal-400 rounded-full mr-1.5 animate-pulse"></span> Cloud Intelligence Core v2.4
                </p>
              </div>
            </div>
            <button onClick={() => setChatMessages([{ role: 'ai', content: 'Chat cleared! Ask me anything about AWS and Cloud Computing.' }])} className="text-slate-500 hover:text-slate-300 text-xs p-1 transition-colors" title="Clear chat">
              <RotateCcw size={14} />
            </button>
          </div>

          <div className="flex-1 p-4 overflow-y-auto space-y-4 text-sm leading-relaxed">
            {chatMessages.map((msg, idx) => (
              <div key={idx} className={`flex items-start space-x-2.5 max-w-[88%] ${msg.role === 'user' ? 'ml-auto justify-end' : ''}`}>
                {msg.role === 'ai' && (
                  <div className="w-7 h-7 rounded-lg bg-slate-700 flex items-center justify-center text-slate-300 text-xs flex-shrink-0 mt-0.5">
                    <Bot size={14} />
                  </div>
                )}
                <div className={msg.role === 'user' ? 'bg-teal-500 text-slate-950 px-4 py-2.5 rounded-2xl rounded-tr-none font-medium shadow-sm order-1 text-sm' : 'bg-slate-950 border border-slate-700 px-4 py-3 rounded-2xl rounded-tl-none text-slate-200 shadow-sm order-1 text-sm'}>
                  {msg.content}
                </div>
                {msg.role === 'user' && (
                  <div className="w-7 h-7 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center text-xs flex-shrink-0 order-2 ml-2.5">
                    <User size={14} />
                  </div>
                )}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          <div className="p-3 bg-slate-950/60 border-t border-slate-700">
            <form onSubmit={handleChat} className="flex items-center space-x-2">
              <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Ask about AWS or Cloud..." className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all text-sm" />
              <button type="submit" disabled={!chatInput.trim()} className="bg-teal-500 hover:bg-teal-600 disabled:opacity-50 text-slate-950 p-3 rounded-xl transition-all shadow-md flex items-center justify-center cursor-pointer">
                <Send size={16} />
              </button>
            </form>
          </div>
        </div>
      </main>

      {/* Toast Notification */}
      <div className={`fixed bottom-6 right-6 z-50 bg-slate-800 border border-slate-700 text-white text-sm font-medium px-5 py-3 rounded-2xl shadow-2xl flex items-center space-x-3 max-w-xs transition-all duration-300 ${toast ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0 pointer-events-none'}`}>
        {toast?.icon}
        <span>{toast?.msg}</span>
      </div>
    </div>
  );
}
