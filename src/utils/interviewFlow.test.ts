import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isCandidateReadyConfirmation,
  pickNaturalBrowserVoice,
  splitIntoNaturalSpeechChunks,
  getVoiceToneLabel,
} from './interviewFlow';

test('isCandidateReadyConfirmation recognizes verbal ready responses and rejects hesitation phrases', () => {
  assert.equal(isCandidateReadyConfirmation('Yes, I am ready to begin!'), true);
  assert.equal(isCandidateReadyConfirmation("Sounds good, let's start"), true);
  assert.equal(isCandidateReadyConfirmation('Yeah go ahead'), true);
  assert.equal(isCandidateReadyConfirmation('Hold on, I am not ready yet'), false);
  assert.equal(isCandidateReadyConfirmation('Wait one second please'), false);
  assert.equal(isCandidateReadyConfirmation(''), false);
});

test('pickNaturalBrowserVoice prioritizes natural/neural English voices and respects voiceOverride', () => {
  const voices = [
    { name: 'eSpeak English', lang: 'en-US', localService: true },
    { name: 'Microsoft Aria Online (Natural) - English (United States)', lang: 'en-US', localService: false },
    { name: 'Microsoft Guy Online (Natural) - English (United States)', lang: 'en-US', localService: false },
    { name: 'Alex', lang: 'en-US', localService: true },
  ];

  const chosenFemale = pickNaturalBrowserVoice(voices, 'Sarah', 'Kore');
  assert.ok(chosenFemale);
  assert.match(chosenFemale.name, /Aria/);

  const chosenMale = pickNaturalBrowserVoice(voices, 'Sarah', 'Charon');
  assert.ok(chosenMale);
  assert.match(chosenMale.name, /Guy/);
});

test('splitIntoNaturalSpeechChunks groups long prompts into conversational sentence chunks', () => {
  const text =
    "Hi there, I'm Sarah, and I'm excited to speak with you today. We will cover system architecture first. Then we'll dive into distributed caching tradeoffs and fault tolerance under heavy load. Finally, we will walk through incident response and production observability. Are you ready to get started?";
  const chunks = splitIntoNaturalSpeechChunks(text);
  assert.ok(chunks.length >= 2);
  assert.ok(chunks.every((chunk) => chunk.length <= 220));
  assert.equal(chunks.join(' ').replace(/\s+/g, ' ').trim(), text);
});

test('getVoiceToneLabel returns human-readable voice agent labels', () => {
  assert.equal(getVoiceToneLabel('Sarah'), 'Kore · Warm Executive (Ava)');
  assert.equal(getVoiceToneLabel('Marcus Reed'), 'Charon · Grounded Director (Andrew)');
  assert.equal(getVoiceToneLabel('Sarah', 'Zephyr'), 'Zephyr · Crisp Analytical (Emma)');
});
