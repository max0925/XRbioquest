import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { parseSignupFields, roleHome } from '@/lib/auth/signup';

function logSignupFailure(operation:string,error:{message?:string;code?:string;status?:number}|null){
  console.error('[AUTH SIGNUP] Operation failed',{operation,code:error?.code??null,status:error?.status??null,message:error?.message??'Unknown error'});
}

export async function POST(request:NextRequest){
  let body:unknown;
  try{body=await request.json();}catch{return NextResponse.json({error:'Invalid JSON body.'},{status:400});}
  const fields=parseSignupFields(body);
  if(!fields)return NextResponse.json({error:'Enter a valid name, email, strong password, and account role.'},{status:400});

  const supabase=await createClient();
  const callbackUrl=new URL('/auth/callback',request.nextUrl.origin);
  const {data,error}=await supabase.auth.signUp({email:fields.email,password:fields.password,options:{data:{full_name:fields.displayName,display_name:fields.displayName},emailRedirectTo:callbackUrl.toString()}});
  if(error){logSignupFailure('create auth user',error);return NextResponse.json({error:'Unable to create this account. Check your details or try signing in.'},{status:error.status===429?429:400});}
  if(!data.user||data.user.identities?.length===0){return NextResponse.json({success:true,confirmationRequired:true});}

  const admin=getSupabaseAdmin();
  const userId=data.user.id;
  const {error:roleError}=await admin.auth.admin.updateUserById(userId,{app_metadata:{...data.user.app_metadata,role:fields.role}});
  if(roleError){logSignupFailure('assign classroom role',roleError);await admin.auth.admin.deleteUser(userId);return NextResponse.json({error:'Account setup could not be completed. Please try again.'},{status:500});}
  const {error:profileError}=await (admin as any).from('classroom_profiles').upsert({user_id:userId,display_name:fields.displayName},{onConflict:'user_id'});
  if(profileError){logSignupFailure('create classroom profile',profileError);await admin.auth.admin.deleteUser(userId);return NextResponse.json({error:'Account setup could not be completed. Please try again.'},{status:500});}

  if(data.session){
    const {data:refreshed,error:refreshError}=await supabase.auth.refreshSession();
    if(refreshError||refreshed.user?.app_metadata?.role!==fields.role){logSignupFailure('refresh role session',refreshError);return NextResponse.json({error:'Account created. Please sign in to continue.'},{status:409});}
    return NextResponse.json({success:true,confirmationRequired:false,redirect:roleHome(fields.role)});
  }
  // Self-selected teacher access can be replaced with invitation or approval checks later.
  return NextResponse.json({success:true,confirmationRequired:true});
}
