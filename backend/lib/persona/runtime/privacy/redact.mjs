const REDACTION_RULES = [
  {
    label: 'phone',
    pattern: /(?<!\d)(?:\+?86[-\s]?)?1[3-9]\d{9}(?!\d)/g,
    replacement: '[PHONE_REDACTED]'
  },
  {
    label: 'email',
    pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
    replacement: '[EMAIL_REDACTED]'
  },
  {
    label: 'wechat_id',
    pattern: /(?:微信(?:号|ID)?|WeChat|wechat)\s*[:：]?\s*[A-Za-z][-_A-Za-z0-9]{5,19}/gi,
    replacement: '微信号:[WECHAT_ID_REDACTED]'
  },
  {
    label: 'qq',
    pattern: /(?:QQ|qq)\s*[:：]?\s*[1-9]\d{4,11}/g,
    replacement: 'QQ:[QQ_REDACTED]'
  },
  {
    label: 'id_card',
    pattern: /\b\d{6}(?:19|20)\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])\d{3}[\dXx]\b/g,
    replacement: '[ID_CARD_REDACTED]'
  }
];

export function redactPrivateText(value) {
  let text = String(value || '');
  const counts = {};
  for (const rule of REDACTION_RULES) {
    text = text.replace(rule.pattern, () => {
      counts[rule.label] = (counts[rule.label] || 0) + 1;
      return rule.replacement;
    });
  }

  return {
    text,
    counts,
    redactionCount: Object.values(counts).reduce((sum, count) => sum + count, 0)
  };
}
