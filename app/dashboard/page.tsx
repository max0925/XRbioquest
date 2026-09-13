'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { BookOpen, CalendarClock, CheckCircle2, ClipboardList, GraduationCap, Loader2, Plus, Users } from 'lucide-react';
import Navigation from '@/components/Navigation';

type DashboardData = {
  role: 'teacher';
  overview: { classCount:number; totalStudents:number; activeAssignments:number; needsReview:number };
  recentAssignments: Array<{ id:string; title:string; className:string; dueAt:string|null; status:string; completedCount:number; studentCount:number; completionRate:number }>;
  recentExperiences: Array<{ id:string; title:string; visibility:'draft'|'published'; updatedAt:string }>;
};

export default function DashboardPage() {
  const router=useRouter();
  const [data,setData]=useState<DashboardData|null>(null);
  const [state,setState]=useState<'loading'|'ready'|'auth'|'forbidden'|'error'>('loading');

  useEffect(()=>{let active=true;void (async()=>{try{
    const response=await fetch('/api/dashboard',{cache:'no-store'});
    const body=await response.json().catch(()=>({}));
    if(!active)return;
    if(response.status===401){setState('auth');return;}
    if(body.redirect==='/student'){router.replace('/student');return;}
    if(response.status===403){setState('forbidden');return;}
    if(!response.ok||body.role!=='teacher'||!body.overview)throw new Error('Dashboard response was incomplete');
    setData(body);setState('ready');
  }catch(error){console.error('[DASHBOARD] Load failed',{message:error instanceof Error?error.message:'Unknown client error'});if(active)setState('error');}})();return()=>{active=false;};},[router]);

  return <div className="min-h-screen bg-slate-50"><Navigation/><main className="px-5 pb-16 pt-28 sm:px-6"><div className="mx-auto max-w-6xl">
    <header className="mb-8"><p className="text-sm font-bold uppercase tracking-widest text-emerald-700">Teacher workspace</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Teacher Dashboard</h1><p className="mt-2 max-w-2xl text-slate-600">A clear view of your classes, assignments, and BioQuest experiences.</p></header>
    {state==='loading'?<Loading/>:state==='auth'?<Gate title="Sign in to view your teacher dashboard" text="Your classroom overview is available after you sign in." href="/login?redirect=/dashboard" label="Sign in"/>:state==='forbidden'?<Gate title="Classroom role required" text="This account does not have a trusted teacher or student role. Ask an administrator to update the account role." href="/" label="Return home"/>:state==='error'||!data?<ErrorState/>:<DashboardContent data={data}/>} 
  </div></main></div>;
}

function DashboardContent({data}:{data:DashboardData}) {
  const cards=[
    {label:'My Classes',value:data.overview.classCount,icon:GraduationCap},
    {label:'Total Students',value:data.overview.totalStudents,icon:Users},
    {label:'Active Assignments',value:data.overview.activeAssignments,icon:ClipboardList},
    {label:'Needs Review',value:data.overview.needsReview,icon:CheckCircle2},
  ];
  return <div className="space-y-8">
    <section aria-labelledby="overview-heading"><div className="mb-4 flex items-center justify-between"><h2 id="overview-heading" className="text-xl font-bold text-slate-950">Overview</h2><span className="text-sm text-slate-500">Current classroom totals</span></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{cards.map(({label,value,icon:Icon})=><article key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><Icon className="h-5 w-5" aria-hidden="true"/></div><p className="mt-5 text-3xl font-bold tabular-nums text-slate-950">{value}</p><p className="mt-1 text-sm font-medium text-slate-600">{label}</p></article>)}</div></section>
    <QuickActions/>
    <div className="grid gap-8 lg:grid-cols-[1.35fr_1fr]"><Assignments items={data.recentAssignments}/><Experiences items={data.recentExperiences}/></div>
  </div>;
}

function QuickActions(){const actions=[{href:'/classes',label:'Create class',icon:Users},{href:'/assignments',label:'Create assignment',icon:ClipboardList},{href:'/create',label:'Create experience',icon:Plus}];return <section aria-labelledby="quick-actions-heading"><h2 id="quick-actions-heading" className="mb-4 text-xl font-bold text-slate-950">Quick actions</h2><div className="flex flex-wrap gap-3">{actions.map(({href,label,icon:Icon},index)=><Link key={href} href={href} className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl px-4 text-sm font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2 ${index===2?'bg-emerald-700 text-white hover:bg-emerald-800':'border border-slate-300 bg-white text-slate-800 hover:border-emerald-500 hover:text-emerald-800'}`}><Icon className="h-4 w-4" aria-hidden="true"/>{label}</Link>)}</div></section>}

function Assignments({items}:{items:DashboardData['recentAssignments']}){return <section aria-labelledby="recent-assignments-heading"><div className="mb-4 flex items-center justify-between"><h2 id="recent-assignments-heading" className="text-xl font-bold text-slate-950">Recent Assignments</h2><Link href="/assignments" className="text-sm font-bold text-emerald-700 hover:text-emerald-900">View all</Link></div>{items.length===0?<Empty icon={ClipboardList} title="No assignments yet" text="Create an assignment from one of your published experiences." href="/assignments" label="Create assignment"/>:<div className="space-y-3">{items.map((item)=><article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div className="min-w-0"><h3 className="truncate font-bold text-slate-950">{item.title}</h3><p className="mt-1 text-sm text-slate-600">{item.className}</p><p className="mt-2 flex items-center gap-1.5 text-sm text-slate-600"><CalendarClock className="h-4 w-4" aria-hidden="true"/>{item.dueAt?`Due ${formatDate(item.dueAt)}`:'No due date'}</p></div><div className="sm:text-right"><p className="font-bold tabular-nums text-slate-950">{item.completionRate}%</p><p className="text-xs text-slate-500">{item.completedCount} of {item.studentCount} completed</p></div></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100" aria-label={`${item.completionRate}% completed`}><div className="h-full rounded-full bg-emerald-600" style={{width:`${item.completionRate}%`}}/></div><div className="mt-4 flex gap-4"><Link href="/assignments" className="text-sm font-bold text-slate-700 hover:text-emerald-800">Assignment</Link><Link href={`/assignments/${item.id}/gradebook`} className="text-sm font-bold text-emerald-700 hover:text-emerald-900">Gradebook</Link></div></article>)}</div>}</section>}

function Experiences({items}:{items:DashboardData['recentExperiences']}){return <section aria-labelledby="recent-experiences-heading"><div className="mb-4 flex items-center justify-between"><h2 id="recent-experiences-heading" className="text-xl font-bold text-slate-950">Recent Experiences</h2><Link href="/create" className="text-sm font-bold text-emerald-700 hover:text-emerald-900">Create new</Link></div>{items.length===0?<Empty icon={BookOpen} title="No experiences yet" text="Create your first interactive biology experience." href="/create" label="Create experience"/>:<div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">{items.map((item,index)=><Link key={item.id} href={`/workspace/${item.id}`} className={`flex min-h-20 cursor-pointer items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-emerald-600 ${index>0?'border-t border-slate-100':''}`}><div className="min-w-0"><h3 className="truncate font-bold text-slate-950">{item.title}</h3><p className="mt-1 text-xs text-slate-500">Updated {formatDate(item.updatedAt)}</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${item.visibility==='published'?'bg-emerald-50 text-emerald-800':'bg-slate-100 text-slate-700'}`}>{item.visibility==='published'?'Published':'Draft'}</span></Link>)}</div>}</section>}

function Empty({icon:Icon,title,text,href,label}:{icon:typeof BookOpen;title:string;text:string;href:string;label:string}){return <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center"><Icon className="mx-auto h-9 w-9 text-emerald-700" aria-hidden="true"/><h3 className="mt-3 font-bold text-slate-950">{title}</h3><p className="mx-auto mt-1 max-w-sm text-sm text-slate-600">{text}</p><Link href={href} className="mt-5 inline-flex min-h-11 cursor-pointer items-center rounded-lg bg-emerald-700 px-4 text-sm font-bold text-white hover:bg-emerald-800">{label}</Link></div>}
function Gate({title,text,href,label}:{title:string;text:string;href:string;label:string}){return <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm"><GraduationCap className="mx-auto h-10 w-10 text-emerald-700"/><h2 className="mt-4 text-xl font-bold text-slate-950">{title}</h2><p className="mx-auto mt-2 max-w-lg text-slate-600">{text}</p><Link href={href} className="mt-6 inline-flex min-h-11 items-center rounded-lg bg-emerald-700 px-5 font-bold text-white hover:bg-emerald-800">{label}</Link></div>}
function Loading(){return <div className="flex min-h-72 items-center justify-center gap-3 text-slate-600" role="status"><Loader2 className="h-5 w-5 animate-spin"/>Loading teacher dashboard…</div>}
function ErrorState(){return <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-6"><h2 className="font-bold text-red-900">Could not load the dashboard</h2><p className="mt-1 text-sm text-red-800">Refresh the page to try again. If the problem continues, contact support.</p></div>}
function formatDate(value:string){return new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric'}).format(new Date(value));}
