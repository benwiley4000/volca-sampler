const coolAdjectives = [
  'Cool',
  'Dope',
  'Far-out',
  'Chill',
  'Wicked',
  'Bomb',
  'Superb',
  'Choice',
  'Exquisite',
  'Righteous',
  'Dank',
  'Alright',
  'Very Good',
  'Ice Cold',
];

const sampleSynonyms = [
  'Sample',
  'Cut',
  'Quotation',
  'Extract',
  'Sound',
  'Noise',
  'Clip',
];

export function newSampleName() {
  const adjective =
    coolAdjectives[Math.floor(Math.random() * coolAdjectives.length)];
  const noun =
    sampleSynonyms[Math.floor(Math.random() * sampleSynonyms.length)];
  return `${adjective} ${noun}`;
}
