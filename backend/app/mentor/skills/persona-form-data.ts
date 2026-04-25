export type AdvancedPersonaValues = {
  publicUrlsText: string;
  aiChatShareUrlsText: string;
  projectText: string;
  mentorSpeaker: string;
  meetingSpeaker: string;
  skipPublicSearch: boolean;
  disableOpenalex: boolean;
  uploads: File[];
  wechatFiles: File[];
  meetingFiles: File[];
  thinkingQuestionnaireFiles: File[];
};

export function createEmptyAdvancedPersonaValues(): AdvancedPersonaValues {
  return {
    publicUrlsText: "",
    aiChatShareUrlsText: "",
    projectText: "",
    mentorSpeaker: "",
    meetingSpeaker: "",
    skipPublicSearch: false,
    disableOpenalex: false,
    uploads: [],
    wechatFiles: [],
    meetingFiles: [],
    thinkingQuestionnaireFiles: [],
  };
}

function appendLines(formData: FormData, key: string, value: string) {
  for (const line of String(value || "")
    .split(/[\r\n;；]+/)
    .map((item) => item.trim())
    .filter(Boolean)) {
    formData.append(key, line);
  }
}

function appendFiles(formData: FormData, key: string, files: File[]) {
  for (const file of files) {
    formData.append(key, file);
  }
}

export function appendAdvancedPersonaFields(
  formData: FormData,
  values: AdvancedPersonaValues,
) {
  appendLines(formData, "publicUrls", values.publicUrlsText);
  appendLines(formData, "aiChatShareUrls", values.aiChatShareUrlsText);
  if (values.projectText.trim()) {
    formData.set("projectText", values.projectText.trim());
  }
  if (values.mentorSpeaker.trim()) {
    formData.set("mentorSpeaker", values.mentorSpeaker.trim());
  }
  if (values.meetingSpeaker.trim()) {
    formData.set("meetingSpeaker", values.meetingSpeaker.trim());
  }
  formData.set("skipPublicSearch", String(values.skipPublicSearch));
  formData.set("disableOpenalex", String(values.disableOpenalex));
  appendFiles(formData, "files", values.uploads);
  appendFiles(formData, "wechatFiles", values.wechatFiles);
  appendFiles(formData, "meetingFiles", values.meetingFiles);
  appendFiles(
    formData,
    "thinkingQuestionnaireFiles",
    values.thinkingQuestionnaireFiles,
  );
}
