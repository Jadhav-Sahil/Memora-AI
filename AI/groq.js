const Groq = require("groq-sdk");
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ~4000 chars ≈ ~1000 tokens, leaves room for prompt overhead under 6000 token limit
const CHUNK_SIZE = 4000;

const chunkText = (text) => {
  const chunks = [];
  // Split on sentence boundaries to avoid cutting mid-sentence
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  let current = "";

  for (const sentence of sentences) {
    if ((current + sentence).length > CHUNK_SIZE) {
      if (current) chunks.push(current.trim());
      current = sentence;
    } else {
      current += sentence;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
};

const analyzeChunk = async (chunk, chunkIndex, totalChunks, lowConfidenceSegments) => {
  const response = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    temperature: 0.1,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are a transcription editor and meeting analyst. Return ONLY valid JSON, no markdown.
This is chunk ${chunkIndex + 1} of ${totalChunks} from a meeting transcript.

Output this exact structure:
{"correctedTranscript":"","actionItems":[{"task":"","assignee":null,"deadline":null}],"keyDecisions":[],"deadlines":[{"description":"","date":null,"assignee":null}],"goalsMentioned":[],"risksAndConcerns":[],"projectTags":[],"questionsRaised":[{"question":"","raisedBy":null,"resolved":false}],"confidenceWarnings":[]}

Rules:
- Fix grammar, punctuation, capitalization. Remove meaningless fillers.
- Never add or hallucinate content. Keep unclear phrases as-is.
- Use null for unknown strings, [] for empty lists.
- questionsRaised.resolved: true if answered within this chunk.
- projectTags: technical/business topics (e.g. "API", "deployment").`,
      },
      {
        role: "user",
        content: `Transcript chunk:\n${chunk}\n\nLow Confidence Segments:\n${JSON.stringify(lowConfidenceSegments.slice(0, 5))}`,
      },
    ],
  });

  return JSON.parse(response.choices[0].message.content);
};

const summarizeFullTranscript = async (correctedTranscript) => {
  const response = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    temperature: 0.1,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are a meeting analyst. Given a full corrected transcript, return ONLY valid JSON:
{"summary":"3-5 sentence meeting summary","meetingHealth":{"score":0,"clarity":"low","actionability":"low","participation":"low","notes":""}}

Rules:
- meetingHealth.score: 0-100.
- clarity/actionability/participation: low|medium|high.
- notes: 1-2 sentence plain-English health summary.`,
      },
      {
        role: "user",
        content: `Full transcript:\n${correctedTranscript.slice(0, 4000)}`,
      },
    ],
  });

  return JSON.parse(response.choices[0].message.content);
};

const mergeResults = (chunkResults, summaryResult) => {
  const merged = {
    correctedTranscript: "",
    summary: summaryResult.summary,
    actionItems: [],
    keyDecisions: [],
    deadlines: [],
    goalsMentioned: [],
    risksAndConcerns: [],
    projectTags: [],
    questionsRaised: [],
    meetingHealth: summaryResult.meetingHealth,
    confidenceWarnings: [],
  };

  for (const result of chunkResults) {
    merged.correctedTranscript += (result.correctedTranscript || "") + " ";
    merged.actionItems.push(...(result.actionItems || []));
    merged.keyDecisions.push(...(result.keyDecisions || []));
    merged.deadlines.push(...(result.deadlines || []));
    merged.goalsMentioned.push(...(result.goalsMentioned || []));
    merged.risksAndConcerns.push(...(result.risksAndConcerns || []));
    merged.projectTags.push(...(result.projectTags || []));
    merged.questionsRaised.push(...(result.questionsRaised || []));
    merged.confidenceWarnings.push(...(result.confidenceWarnings || []));
  }

  merged.correctedTranscript = merged.correctedTranscript.trim();
  // Deduplicate flat string arrays
  merged.keyDecisions = [...new Set(merged.keyDecisions)];
  merged.goalsMentioned = [...new Set(merged.goalsMentioned)];
  merged.risksAndConcerns = [...new Set(merged.risksAndConcerns)];
  merged.projectTags = [...new Set(merged.projectTags)];
  merged.confidenceWarnings = [...new Set(merged.confidenceWarnings)];

  return merged;
};

const correctTranscript = async (rawTranscript, lowConfidenceSegments = []) => {
  try {
    const chunks = chunkText(rawTranscript);
    console.log(`Processing transcript in ${chunks.length} chunk(s)...`);

    // Process all chunks in parallel
    const chunkResults = await Promise.all(
      chunks.map((chunk, i) =>
        analyzeChunk(chunk, i, chunks.length, lowConfidenceSegments)
      )
    );

    // Separate summary + health call on the full corrected transcript
    const correctedSoFar = chunkResults
      .map((r) => r.correctedTranscript || "")
      .join(" ");

    const summaryResult = await summarizeFullTranscript(correctedSoFar);

    return mergeResults(chunkResults, summaryResult);
  } catch (error) {
    console.error("Groq Transcript Correction Error:", error);
    throw error;
  }
};

module.exports = { correctTranscript };