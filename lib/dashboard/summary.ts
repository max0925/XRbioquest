type Classroom = { id:string; name:string };
type Assignment = { id:string; class_id:string; title:string; due_at:string|null; status:string };
type Experience = { id:string; title:string; visibility:string|null; updated_at:string|null; created_at:string };
type Membership = { class_id:string; student_id:string };
type Attempt = { assignment_id:string; student_id:string; status:string };

export function buildTeacherDashboard(input:{classes:Classroom[];assignments:Assignment[];experiences:Experience[];memberships:Membership[];attempts:Attempt[]}) {
  const classNames=new Map(input.classes.map((item)=>[item.id,item.name]));
  const studentsByClass=new Map<string,Set<string>>();
  for(const membership of input.memberships){const students=studentsByClass.get(membership.class_id)??new Set<string>();students.add(membership.student_id);studentsByClass.set(membership.class_id,students);}
  const completedByAssignment=new Map<string,Set<string>>();
  const completedStatuses=new Set(['submitted','needs_revision','reviewed']);
  for(const attempt of input.attempts){if(!completedStatuses.has(attempt.status))continue;const students=completedByAssignment.get(attempt.assignment_id)??new Set<string>();students.add(attempt.student_id);completedByAssignment.set(attempt.assignment_id,students);}
  return {
    overview:{classCount:input.classes.length,totalStudents:new Set(input.memberships.map((item)=>item.student_id)).size,activeAssignments:input.assignments.filter((item)=>item.status==='active').length,needsReview:input.attempts.filter((item)=>item.status==='submitted').length},
    recentAssignments:input.assignments.slice(0,6).map((item)=>{const studentCount=studentsByClass.get(item.class_id)?.size??0;const completedCount=completedByAssignment.get(item.id)?.size??0;return{id:item.id,title:item.title,className:classNames.get(item.class_id)??'Unknown class',dueAt:item.due_at,status:item.status,completedCount,studentCount,completionRate:studentCount===0?0:Math.round(completedCount/studentCount*100)};}),
    recentExperiences:input.experiences.map((item)=>({id:item.id,title:item.title,visibility:item.visibility==='published'?'published' as const:'draft' as const,updatedAt:item.updated_at??item.created_at})),
  };
}
