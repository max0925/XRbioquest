import assert from 'node:assert/strict';
import test from 'node:test';
import { applyStructuredLesson, StructuredLessonError, structuredLessonImpact } from '../lib/structured-editor/validation.ts';
import type { GameConfig } from '../types/game-config.ts';

const original: GameConfig = {
  meta:{id:'lesson',title:'Cells',subject:'Biology',grade:'high',duration_minutes:10,ngss_standards:[],learning_objectives:['Explain cells']},
  environment:{skybox_prompt:'lab',lighting:'cool'}, assets:[{id:'cell',name:'Cell',model_source:'primitive',position:[1,2,3],role:'target'}],
  phases:[
    {id:'intro',type:'intro',title:'Welcome',instruction:'Begin the lesson'},
    {id:'find',type:'click',title:'Find it',instruction:'Find the cell',target_asset:'cell',points:10},
    {id:'quiz',type:'quiz',title:'Check',instruction:'Answer this',question:'Which is a cell?',options:[{id:'a',text:'Cell',is_correct:true},{id:'b',text:'Rock',is_correct:false}],explanation:'Correct',points:5},
    {id:'done',type:'complete',title:'Complete',instruction:'Lesson complete'},
  ], knowledge_cards:{}, npc:{name:'Guide',persona:'Tutor',spawn_position:[0,0,0],hints:{find:'Look closely'}}, scoring:{max_possible:15,passing_threshold:70}, hud:{show_score:true,show_phase_counter:true,show_instruction:true,show_timer:true,show_knowledge_cards:true,show_tasks:true},
};

function input(){return {learningObjectives:['Describe cell structure'],phases:[
  {id:'intro',title:'Welcome',instruction:'Begin now',hint:'',learningObjectiveIndices:[]},
  {id:'quiz',title:'Knowledge check',instruction:'Choose one',hint:'Recall the model',learningObjectiveIndices:[0],quiz:{question:'Which is living?',options:[{id:'a',text:'Cell',is_correct:true},{id:'b',text:'Rock',is_correct:false}],correctExplanation:'A cell is living.',incorrectExplanation:'Review cell theory.',points:8}},
  {id:'find',title:'Locate the cell',instruction:'Select the cell',hint:'Look at the model',learningObjectiveIndices:[0]},
  {id:'done',title:'Complete',instruction:'Lesson complete',hint:'',learningObjectiveIndices:[]},
]};}

test('structured save updates content and order while preserving protected gameplay fields',()=>{const result=applyStructuredLesson(original,input());assert.deepEqual(result.phases.map((phase)=>phase.id),['intro','quiz','find','done']);assert.equal(result.phases.find((phase)=>phase.id==='find')?.type,'click');assert.equal((result.phases.find((phase)=>phase.id==='find') as {target_asset:string}).target_asset,'cell');assert.deepEqual(result.assets[0].position,[1,2,3]);assert.equal(result.meta.learning_objectives[0],'Describe cell structure');assert.equal(result.scoring.max_possible,18);});
test('quiz requires two options and exactly one correct answer',()=>{const invalid=input();invalid.phases[1].quiz!.options=[{id:'a',text:'Only',is_correct:true}];assert.throws(()=>applyStructuredLesson(original,invalid),StructuredLessonError);const noCorrect=input();noCorrect.phases[1].quiz!.options.forEach((option)=>option.is_correct=false);assert.throws(()=>applyStructuredLesson(original,noCorrect),/exactly one correct/);});
test('phase deletion, invalid objective links, and moving boundary phases are rejected',()=>{const deleted=input();deleted.phases.pop();assert.throws(()=>applyStructuredLesson(original,deleted),/preserved/);const badLink=input();badLink.phases[1].learningObjectiveIndices=[9];assert.throws(()=>applyStructuredLesson(original,badLink),/invalid learning objective/);const boundary=input();[boundary.phases[0],boundary.phases[1]]=[boundary.phases[1],boundary.phases[0]];assert.throws(()=>applyStructuredLesson(original,boundary),/Intro must remain first/);});
test('published or assigned experiences display the student impact warning',()=>{assert.ok(structuredLessonImpact('published',false));assert.ok(structuredLessonImpact('draft',true));assert.equal(structuredLessonImpact('draft',false),null);});
