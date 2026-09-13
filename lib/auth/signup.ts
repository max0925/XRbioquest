export type SignupRole = 'teacher' | 'student';
export type SignupFields = { displayName:string; email:string; password:string; role:SignupRole };

const EMAIL_PATTERN=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseSignupFields(body:unknown):SignupFields|null {
  if(!body||typeof body!=='object'||Array.isArray(body))return null;
  const value=body as Record<string,unknown>;
  if(typeof value.displayName!=='string'||typeof value.email!=='string'||typeof value.password!=='string')return null;
  if(value.role!=='teacher'&&value.role!=='student')return null;
  const displayName=value.displayName.trim();
  const email=value.email.trim().toLowerCase();
  if(displayName.length<2||displayName.length>80||/[\u0000-\u001f\u007f]/.test(displayName))return null;
  if(email.length>254||!EMAIL_PATTERN.test(email))return null;
  if(value.password.length<8||value.password.length>128||!/[a-z]/.test(value.password)||!/[A-Z]/.test(value.password)||!/[0-9]/.test(value.password))return null;
  return {displayName,email,password:value.password,role:value.role};
}

const STUDENT_PATHS=['/student','/classes','/join','/settings','/play/'];
const TEACHER_PATHS=['/dashboard','/classes','/assignments','/settings','/create','/workspace/','/play/'];

export function roleHome(role:SignupRole){return role==='teacher'?'/dashboard':'/student';}

export function safeRoleRedirect(candidate:string|null|undefined,role:SignupRole):string {
  if(!candidate||!candidate.startsWith('/')||candidate.startsWith('//')||candidate.includes('\\'))return roleHome(role);
  let parsed:URL;
  try{parsed=new URL(candidate,'https://bioquest.invalid');}catch{return roleHome(role);}
  if(parsed.origin!=='https://bioquest.invalid')return roleHome(role);
  const allowed=role==='teacher'?TEACHER_PATHS:STUDENT_PATHS;
  return allowed.some((prefix)=>parsed.pathname===prefix||parsed.pathname.startsWith(prefix.endsWith('/')?prefix:`${prefix}/`))
    ? `${parsed.pathname}${parsed.search}${parsed.hash}`
    : roleHome(role);
}
