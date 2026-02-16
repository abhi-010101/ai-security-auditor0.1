
import React, { useState } from 'react';

// Mock Data for University Knowledge Base
const KB_ARTICLES = [
  {
    id: 'kb-001',
    title: 'University Acceptable Use Policy (AUP) v2.4',
    category: 'Policy',
    updated: '2023-10-15',
    summary: 'Defines the acceptable use of university computing resources, networks, and internet access for students and faculty. Mandatory reading for all new enrollments.',
    tags: ['General', 'Compliance', 'HR']
  },
  {
    id: 'kb-002',
    title: 'Ransomware Incident Response Playbook',
    category: 'Playbook',
    updated: '2023-11-02',
    summary: 'Step-by-step containment and eradication procedures for ransomware events detected on campus networks. Includes isolation protocols for research labs.',
    tags: ['IR', 'Malware', 'Critical']
  },
  {
    id: 'kb-003',
    title: 'ISO 27001: Access Control Standards',
    category: 'Compliance',
    updated: '2023-09-20',
    summary: 'Technical requirements for user authentication, MFA implementation, and privileged access management (PAM) across university infrastructure.',
    tags: ['ISO', 'Access', 'Audit']
  },
  {
    id: 'kb-004',
    title: 'Remote Access (VPN) Security Guidelines',
    category: 'Policy',
    updated: '2024-01-10',
    summary: 'Security mandates for accessing internal university resources from off-campus locations. Covers split-tunneling restrictions and endpoint health checks.',
    tags: ['Network', 'Remote', 'VPN']
  },
  {
    id: 'kb-005',
    title: 'Threat Intel: Edu-Sector Phishing Campaigns',
    category: 'Intelligence',
    updated: '2024-02-14',
    summary: 'Analysis of recent spear-phishing campaigns targeting research departments in higher education. Includes IOCs for blocking at the gateway.',
    tags: ['Phishing', 'Intel', 'Email']
  },
  {
    id: 'kb-006',
    title: 'Cloud Storage Data Classification Guide',
    category: 'Policy',
    updated: '2023-12-05',
    summary: 'Matrix determining which university data types (PII, PHI, Research) are permitted in approved cloud storage providers.',
    tags: ['Cloud', 'DataGov', 'GDPR']
  }
];

const KnowledgeBase: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const categories = ['All', 'Policy', 'Playbook', 'Compliance', 'Intelligence'];

  const filteredArticles = KB_ARTICLES.filter(article => {
    const safeTitle = (article.title || '').toLowerCase();
    const safeSummary = (article.summary || '').toLowerCase();
    const safeSearch = (searchTerm || '').toLowerCase();
    
    const matchesSearch = safeTitle.includes(safeSearch) || 
                          safeSummary.includes(safeSearch);
    const matchesCategory = selectedCategory === 'All' || article.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
       {/* Header */}
       <header className="mb-8 border-b border-indira-border pb-6">
           <h2 className="text-3xl font-black text-indira-navy uni-font">Security Knowledge Base</h2>
           <p className="text-indira-gray text-sm mt-1 uppercase tracking-widest font-bold">Central Repository for Policies & Procedures</p>
       </header>

       {/* Controls */}
       <div className="flex flex-col md:flex-row gap-6 mb-8">
           <div className="flex-1 relative">
               <svg className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-indira-gray" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
               <input 
                  type="text" 
                  placeholder="Search documentation, policies, IOCs..." 
                  className="w-full pl-12 pr-4 py-4 rounded-xl border border-indira-border shadow-sm focus:ring-2 focus:ring-indira-brand focus:border-transparent outline-none transition-all text-sm font-medium text-indira-navy"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
               />
           </div>
           <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
               {categories.map(cat => (
                   <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${
                          selectedCategory === cat 
                          ? 'bg-indira-navy text-indira-gold shadow-lg' 
                          : 'bg-white border border-indira-border text-indira-gray hover:bg-indira-subtle hover:text-indira-navy'
                      }`}
                   >
                       {cat}
                   </button>
               ))}
           </div>
       </div>

       {/* Grid */}
       <div className="grid grid-cols-1 gap-4">
           {filteredArticles.map(article => (
               <div key={article.id} className="bg-white p-6 rounded-xl border border-indira-border hover:border-indira-brand hover:shadow-md transition-all group cursor-pointer relative overflow-hidden">
                   {/* Brand Accent */}
                   <div className="absolute left-0 top-0 bottom-0 w-1 bg-indira-subtle group-hover:bg-indira-gold transition-colors"></div>
                   
                   <div className="pl-4">
                        <div className="flex justify-between items-start mb-2">
                            <span className={`px-3 py-1 rounded text-[9px] font-black uppercase border tracking-wider ${
                                article.category === 'Policy' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                article.category === 'Playbook' ? 'bg-purple-50 text-purple-700 border-purple-100' :
                                article.category === 'Compliance' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                'bg-amber-50 text-amber-700 border-amber-100'
                            }`}>
                                {article.category}
                            </span>
                            <span className="text-[10px] text-indira-gray font-bold uppercase tracking-wide">Last Updated: {article.updated}</span>
                        </div>
                        <h3 className="text-lg font-black text-indira-navy mb-2 group-hover:text-indira-brand transition-colors">{article.title}</h3>
                        <p className="text-slate-600 text-sm mb-4 leading-relaxed font-medium">{article.summary}</p>
                        <div className="flex items-center gap-2">
                            {article.tags.map(tag => (
                                <span key={tag} className="text-[10px] font-bold uppercase text-slate-400 bg-slate-50 px-2 py-1 rounded border border-slate-100">#{tag}</span>
                            ))}
                            <div className="ml-auto flex items-center gap-1 text-indira-brand text-xs font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0">
                                Access Document <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>
                            </div>
                        </div>
                   </div>
               </div>
           ))}
           {filteredArticles.length === 0 && (
               <div className="text-center py-20 border-2 border-dashed border-indira-border rounded-xl">
                   <p className="font-bold text-indira-gray">No documents found matching your criteria.</p>
                   <button onClick={() => {setSearchTerm(''); setSelectedCategory('All')}} className="mt-4 text-indira-brand text-sm font-bold underline">Clear filters</button>
               </div>
           )}
       </div>
    </div>
  );
};

export default KnowledgeBase;
