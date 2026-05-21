import {
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { createPaperflowClient, type PaperflowClient } from "./api";
import { PdfViewer, type PdfBboxHighlight } from "./PdfViewer";
import type {
  AgentConfig,
  AgentConfigUpdate,
  AgentStatus,
  Claim,
  Evidence,
  FieldMap,
  FieldMapRelationshipGraph,
  MilestonePaper,
  Paper,
  PaperChatResponse,
  PaperSession,
  R1QueryTraceEntry,
  ReadingReport,
  RelatedWorkItem,
  TaskStatus,
  TimelineEvent,
} from "./types";
import "./styles.css";

const defaultClient = createPaperflowClient();
type Locale = "zh" | "en";

const RAIL_WIDTH_STORAGE_KEY = "paperflow.workspaceRailWidth.v2";
const PDF_WIDTH_STORAGE_KEY = "paperflow.workspacePdfWidth.v2";
const REPORT_WIDTH_STORAGE_KEY = "paperflow.workspaceReportWidth.v2";
const PDF_WIDTH_DEFAULT = 920;
const PDF_WIDTH_MIN = 640;
const PDF_WIDTH_MAX = 1440;
const REPORT_WIDTH_DEFAULT = 420;
const REPORT_WIDTH_MIN = 320;
const REPORT_WIDTH_MAX = 760;
const RAIL_WIDTH_DEFAULT = 380;
const RAIL_WIDTH_MIN = 300;
const RAIL_WIDTH_MAX = 720;
const PDF_PAGE_FALLBACK_HIGHLIGHT_BBOX: PdfBboxHighlight["bbox"] = [36, 36, 560, 176];

const UI_TEXT = {
  zh: {
    readyStatus: "已准备好自动执行 R0 + 轻量 R1 处理。",
    backendMissing: "后端未连接。请先启动 FastAPI 再加载文献库。",
    queuedStatus: "PDF 已加入 Agent 解析队列。",
    importFailed: "导入失败。",
    reportUnavailable: "这篇论文的报告还不可用。",
    parseTimeout: "Agent 解析超时。你可以在论文工作台里重试。",
    eyebrow: "本地优先的论文研读台",
    libraryTitle: "Paperflow",
    heroDescription:
      "导入论文，生成带证据的阅读报告。",
    agentLabel: "Agent",
    agentConfig: "Agent 配置",
    agentConfigSaved: "Agent 配置已保存。",
    agentConfigFailed: "Agent 配置保存失败。",
    agentModel: "DeepSeek 模型",
    agentTimeout: "报告超时（秒）",
    saveAgentConfig: "保存 Agent 配置",
    agentConfigHint: "新配置会在下一次导入或重新运行 Agent 时生效。",
    agentApiKey: "DeepSeek API Key",
    agentApiKeyPlaceholder: "输入新的 API Key，不会回显",
    agentApiKeyConfigured: "Key 已配置",
    agentApiKeyMissing: "Key 未配置",
    configured: "已配置",
    missingKey: "缺少 key",
    languageToggle: "English",
    importPdf: "导入 PDF",
    importPdfHint: "本地 PDF 文件",
    arxivImportTitle: "从 arXiv 导入",
    arxivPlaceholder: "arXiv ID 或链接",
    importArxiv: "下载并解析",
    arxivQueuedStatus: "arXiv PDF 已开始下载并加入解析队列。",
    emptyArxiv: "请输入 arXiv 链接或 ID。",
    urlImportTitle: "从 URL 导入",
    urlPlaceholder: "DOI / Semantic Scholar / OpenReview",
    importUrl: "解析元数据并下载",
    urlQueuedStatus: "已识别 URL 元数据,开始下载 PDF。",
    emptyUrl: "请输入论文 URL 或 DOI。",
    zoteroImportTitle: "从 Zotero 导入",
    zoteroPath: "~/Zotero/zotero.sqlite",
    zoteroImportButton: "导入本地 Zotero 库",
    zoteroImported: (count: number) => `已从 Zotero 导入 ${count} 篇论文。`,
    zoteroEmpty: "Zotero 库为空或没有可解析的 PDF 附件。",
    importsLabel: "导入论文",
    librarySection: "文献库",
    recentPapers: "最近论文",
    paperCount: (n: number) => `${n} 篇`,
    notePrefix: "笔记",
    openPaper: (title: string) => `打开 ${title}`,
    openPaperAction: "打开",
    deletePaper: (title: string) => `删除 ${title}`,
    deletePaperAction: "删除",
    confirmDeletePaper: (title: string) => `确认删除 ${title}`,
    confirmDeletePaperAction: "确认删除",
    deleteFailed: "删除失败。",
    processingStatus: "处理状态",
    savedReports: "已保存报告",
    navImport: "导入",
    navPapers: "论文",
    navReport: "报告",
    navFieldMap: "Field Map",
    navAgent: "Agent",
    noNote: "尚未保存 Obsidian 笔记",
    backToLibrary: "返回文献库",
    reportNotReady: "Agent 报告还没生成。",
    readingReport: "阅读报告",
    executiveSummary: "执行摘要",
    relatedWork: "R1 相关工作",
    evidenceButton: (count: number) => `查看 ${count} 条证据`,
    selectedClaim: "选中的结论",
    agentStatus: "Agent 状态",
    noActiveTask: "当前没有任务。",
    rerunAgent: "重新运行 Agent",
    agentifyPaper: (title: string) => `重新 Agentify 获取 ${title} 的信息`,
    agentifyPaperAction: "重新 Agentify 获取信息",
    jumpToAgent: "跳到 Agent",
    jumpToChatInput: "回到输入框",
    evidenceDetail: "证据详情",
    missingEvidence: "缺少证据。",
    selectClaim: "选择一个 claim 查看证据。",
    agentChat: "Agent 对话",
    chatIdle: "等待提问",
    chatRunning: "Agent 正在处理",
    chatCompleted: "回答已生成",
    chatFailed: "回答失败",
    webSearchNotice: "使用了外部网页搜索；这些来源不是 PDF 原文证据。",
    askPlaceholder: "例如:只看 benchmark 和 dataset",
    ask: "发送",
    processCards: "过程",
    obsidian: "Obsidian",
    saveNote: "保存 / 更新 Obsidian 笔记",
    savedTo: (path: string) => `已保存到 ${path}`,
    page: (page: number) => `p. ${page}`,
    pdfPanel: "PDF 阅读",
    selectionAsk: "针对选区追问",
    selectionPlaceholder: "在 PDF 中选中文本,再点这里追问。",
    enableViewer: "打开 PDF 阅读器",
    disableViewer: "关闭 PDF 阅读器",
    locationExact: "已精确定位",
    locationPageQuote: "已定位到页 + 段落",
    locationQuoteOnly: "无法在 PDF 中定位",
    locationMissing: "缺少证据原文",
    r1RunSearch: "运行 R1 检索",
    r1Running: "正在跑 R1 搜索…",
    r1Updated: (count: number) => `R1 检索完成,共 ${count} 篇相关论文。`,
    r1Failed: "R1 检索失败:",
    r1QueryTrace: "R1 检索踪迹",
    r1ComparisonRisk: "对比风险:",
    r1CitedBy: (count: number) => `${count} 引用`,
    r1InfluentialCitedBy: (count: number) => `${count} 高影响力引用`,
    fieldMapTitle: "领域地图",
    fieldMapGenerate: "生成 Field Map",
    fieldMapRegenerate: "重跑 Field Map",
    fieldMapRunning: "Field Map 生成中…",
    fieldMapFailed: "Field Map 生成失败:",
    fieldMapSummary: "领域摘要",
    fieldMapTaskTaxonomy: "任务定义",
    fieldMapDatasets: "数据集 / Benchmark",
    fieldMapMetrics: "评价指标",
    fieldMapMethodFamilies: "方法家族",
    fieldMapMilestones: "里程碑论文",
    fieldMapTimeline: "技术时间线",
    fieldMapRelationshipGraph: "前后关系图",
    fieldMapGraphPredecessor: "前置基础",
    fieldMapGraphSeed: "Seed",
    fieldMapGraphSuccessor: "后续影响",
    fieldMapAgentSuggested: "Agent 建议关系",
    fieldMapRuleSuggested: "规则来源关系",
    fieldMapOpenProblems: "未解决问题",
    fieldMapRecentTrends: "近期趋势 (R2)",
    fieldMapOpportunities: "研究机会 (R2)",
    fieldMapEmpty:
      "尚未生成 Field Map。先运行 R1 检索可以让结果更可信。",
    fieldMapWhy: "判定理由:",
    fieldMapRisk: "风险:",
    statusLabels: {
      queued: "排队中",
      processing: "解析中",
      completed: "已完成",
      failed: "失败",
      unknown: "未知",
    },
    taskMessages: {
      "Ready for automatic R0 + lightweight R1 processing.":
        "已准备好自动执行 R0 + 轻量 R1 处理。",
      "Backend not connected. Start FastAPI to load your library.":
        "后端未连接。请先启动 FastAPI 再加载文献库。",
      "Queued PDF for Agent parsing...": "PDF 已加入 Agent 解析队列。",
      "arXiv PDF download queued for parsing.":
        "arXiv PDF 已开始下载并加入解析队列。",
      "Import failed.": "导入失败。",
      "Reading report generated": "阅读报告已生成",
      "Queued for Agent parsing": "已加入 Agent 解析队列",
      "PaperAgent is preparing PDF text and report context":
        "正在准备 PDF 文本和 Agent 上下文。",
      "DeepSeek report received; locating evidence":
        "DeepSeek 已返回报告，正在定位证据。",
      "Evidence locations resolved; saving report":
        "证据位置已解析，正在保存报告。",
      "DeepSeek PaperAgent is parsing the PDF":
        "DeepSeek PaperAgent 正在解析 PDF",
      "DeepSeek report generation timed out. The PDF may be long or the model may be slow; retry later or increase DEEPSEEK_REPORT_READ_TIMEOUT.":
        "DeepSeek 生成阅读报告超时。PDF 可能较长或模型响应较慢，可以稍后重试；长论文可调高 DEEPSEEK_REPORT_READ_TIMEOUT。",
      "Queued for Agent rerun": "已加入 Agent 重跑队列",
    },
    sectionTitles: {
      Task: "任务",
      Dataset: "数据集",
      "Benchmark / Metric": "Benchmark / 指标",
      Method: "方法",
      "Input / Output": "输入 / 输出",
      "Compute / Training": "算力 / 训练",
      Limitations: "局限性",
      "Agent Required": "需要配置 Agent",
    },
  },
  en: {
    readyStatus: "Ready for automatic R0 + lightweight R1 processing.",
    backendMissing: "Backend not connected. Start FastAPI to load your library.",
    queuedStatus: "Queued PDF for Agent parsing...",
    importFailed: "Import failed.",
    reportUnavailable: "Report is not available for this paper yet.",
    parseTimeout:
      "Agent parsing timed out. You can retry from the paper workspace.",
    eyebrow: "Local-first research workspace",
    libraryTitle: "Paperflow Library",
    heroDescription:
      "Bring in papers, generate evidence-aware reading reports, and save Obsidian-native notes for long-term research.",
    agentLabel: "Agent",
    agentConfig: "Agent Config",
    agentConfigSaved: "Agent config saved.",
    agentConfigFailed: "Agent config save failed.",
    agentModel: "DeepSeek Model",
    agentTimeout: "Report Timeout (seconds)",
    saveAgentConfig: "Save Agent Config",
    agentConfigHint: "New settings apply to the next import or Agent rerun.",
    agentApiKey: "DeepSeek API Key",
    agentApiKeyPlaceholder: "Enter a new API key; it will not be echoed",
    agentApiKeyConfigured: "Key configured",
    agentApiKeyMissing: "Key missing",
    configured: "configured",
    missingKey: "missing key",
    languageToggle: "中文",
    importPdf: "Import PDF",
    importPdfHint: "Drop a PDF or browse to choose one",
    arxivImportTitle: "Import from arXiv",
    arxivPlaceholder: "Paste an arXiv URL or ID, e.g. 2605.08063v1",
    importArxiv: "Download and Parse",
    arxivQueuedStatus: "arXiv PDF download queued for parsing.",
    emptyArxiv: "Enter an arXiv URL or ID.",
    urlImportTitle: "Import from URL",
    urlPlaceholder:
      "arXiv / DOI / Semantic Scholar / OpenReview URL, auto-detected",
    importUrl: "Fetch metadata and download",
    urlQueuedStatus: "Metadata fetched, downloading PDF.",
    emptyUrl: "Enter a paper URL or DOI.",
    zoteroImportTitle: "Import from Zotero",
    zoteroPath: "~/Zotero/zotero.sqlite",
    zoteroImportButton: "Import local Zotero library",
    zoteroImported: (count: number) => `Imported ${count} papers from Zotero.`,
    zoteroEmpty: "Zotero library is empty or has no PDF attachments.",
    importsLabel: "Import",
    librarySection: "Library",
    recentPapers: "Recent Papers",
    paperCount: (n: number) => `${n} item${n === 1 ? "" : "s"}`,
    notePrefix: "Note",
    openPaper: (title: string) => `Open ${title}`,
    openPaperAction: "Open",
    deletePaper: (title: string) => `Delete ${title}`,
    deletePaperAction: "Delete",
    confirmDeletePaper: (title: string) => `Confirm delete ${title}`,
    confirmDeletePaperAction: "Confirm delete",
    deleteFailed: "Delete failed.",
    processingStatus: "Processing Status",
    savedReports: "Saved Reports",
    navImport: "Import",
    navPapers: "Papers",
    navReport: "Report",
    navFieldMap: "Field Map",
    navAgent: "Agent",
    noNote: "No Obsidian note yet",
    backToLibrary: "Back to Library",
    reportNotReady: "Agent report is not ready yet.",
    readingReport: "Reading Report",
    executiveSummary: "Executive Summary",
    relatedWork: "R1 Related Work",
    evidenceButton: (count: number) =>
      `View ${count} evidence item${count === 1 ? "" : "s"}`,
    selectedClaim: "Selected claim",
    agentStatus: "Agent Status",
    noActiveTask: "No active task.",
    rerunAgent: "Re-run Agent",
    agentifyPaper: (title: string) => `Re-agentify ${title}`,
    agentifyPaperAction: "Re-agentify",
    jumpToAgent: "Jump to Agent",
    jumpToChatInput: "Back to input",
    evidenceDetail: "Evidence Detail",
    missingEvidence: "Missing evidence.",
    selectClaim: "Select a claim to inspect its evidence.",
    agentChat: "Agent Chat",
    chatIdle: "Waiting for a question",
    chatRunning: "Agent is working",
    chatCompleted: "Answer generated",
    chatFailed: "Answer failed",
    webSearchNotice: "External web search was used; these sources are not PDF evidence.",
    askPlaceholder: "e.g. focus on benchmark and dataset",
    ask: "Send",
    processCards: "Process",
    obsidian: "Obsidian",
    saveNote: "Save / Update Obsidian Note",
    savedTo: (path: string) => `Saved to ${path}`,
    page: (page: number) => `p. ${page}`,
    pdfPanel: "PDF Viewer",
    selectionAsk: "Ask about selection",
    selectionPlaceholder:
      "Select text in the PDF, then click to ask.",
    enableViewer: "Open PDF viewer",
    disableViewer: "Close PDF viewer",
    locationExact: "located precisely",
    locationPageQuote: "page + paragraph",
    locationQuoteOnly: "no PDF location",
    locationMissing: "no evidence quote",
    r1RunSearch: "Run R1 search",
    r1Running: "Running R1 search…",
    r1Updated: (count: number) => `R1 search returned ${count} related papers.`,
    r1Failed: "R1 search failed: ",
    r1QueryTrace: "R1 query trace",
    r1ComparisonRisk: "Comparison risk: ",
    r1CitedBy: (count: number) => `${count} cites`,
    r1InfluentialCitedBy: (count: number) => `${count} high-impact cites`,
    fieldMapTitle: "Field Map",
    fieldMapGenerate: "Generate Field Map",
    fieldMapRegenerate: "Re-run Field Map",
    fieldMapRunning: "Building Field Map…",
    fieldMapFailed: "Field Map failed: ",
    fieldMapSummary: "Field Summary",
    fieldMapTaskTaxonomy: "Task Taxonomy",
    fieldMapDatasets: "Datasets / Benchmarks",
    fieldMapMetrics: "Metrics",
    fieldMapMethodFamilies: "Method Families",
    fieldMapMilestones: "Milestone Papers",
    fieldMapTimeline: "Technology Timeline",
    fieldMapRelationshipGraph: "Lineage Graph",
    fieldMapGraphPredecessor: "Predecessors",
    fieldMapGraphSeed: "Seed",
    fieldMapGraphSuccessor: "Successors",
    fieldMapAgentSuggested: "Agent-suggested relation",
    fieldMapRuleSuggested: "Rule-derived relation",
    fieldMapOpenProblems: "Open Problems",
    fieldMapRecentTrends: "Recent Trends (R2)",
    fieldMapOpportunities: "Research Opportunities (R2)",
    fieldMapEmpty:
      "No Field Map yet. Running R1 search first will give better results.",
    fieldMapWhy: "Why milestone: ",
    fieldMapRisk: "Risk: ",
    statusLabels: {
      queued: "queued",
      processing: "processing",
      completed: "completed",
      failed: "failed",
      unknown: "unknown",
    },
    taskMessages: {},
    sectionTitles: {},
  },
};

interface AppProps {
  initialPapers?: Paper[];
  initialReports?: Record<string, ReadingReport>;
  client?: PaperflowClient;
}

type ImportActivityStage =
  | "uploading"
  | "downloading"
  | "resolving"
  | "queued"
  | "processing"
  | "slow"
  | "completed"
  | "failed";

interface ImportActivity {
  stage: ImportActivityStage;
  title?: string;
  message?: string;
}

type ChatPanelStatus = "idle" | "running" | "completed" | "failed";

export function App({
  initialPapers = [],
  initialReports = {},
  client = defaultClient,
}: AppProps) {
  const [locale, setLocale] = useState<Locale>(readInitialLocale);
  const text = UI_TEXT[locale];
  const [papers, setPapers] = useState(initialPapers);
  const [reports, setReports] = useState(initialReports);
  const [selectedPaper, setSelectedPaper] = useState<Paper | null>(null);
  const [status, setStatus] = useState(UI_TEXT.en.readyStatus);
  const [error, setError] = useState<string | null>(null);
  const [agentStatus, setAgentStatus] = useState<AgentStatus | null>(null);
  const [agentConfig, setAgentConfig] = useState<AgentConfig | null>(null);
  const [agentConfigDraft, setAgentConfigDraft] = useState<AgentConfigUpdate>({});
  const [agentConfigMessage, setAgentConfigMessage] = useState<string | null>(null);
  const [arxivInput, setArxivInput] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [importNotice, setImportNotice] = useState<string | null>(null);
  const [importActivity, setImportActivity] = useState<ImportActivity | null>(null);

  useEffect(() => {
    document.documentElement.lang = locale === "zh" ? "zh-CN" : "en";
    if (typeof window.localStorage?.setItem === "function") {
      window.localStorage.setItem("paperflow-locale", locale);
    }
  }, [locale]);

  useEffect(() => {
    if (initialPapers.length > 0) {
      return;
    }
    void refreshLibrary();
  }, [client, initialPapers.length]);

  useEffect(() => {
    if (agentConfigMessage !== text.agentConfigSaved) {
      return;
    }
    const timer = window.setTimeout(() => {
      setAgentConfigMessage(null);
    }, 2200);
    return () => window.clearTimeout(timer);
  }, [agentConfigMessage, text.agentConfigSaved]);

  async function refreshLibrary() {
    try {
      const [library, agent, config] = await Promise.all([
        client.listPapers(),
        client.getAgentStatus(),
        client.getAgentConfig(),
      ]);
      setPapers(library);
      setAgentStatus(agent);
      setAgentConfig(config);
      setAgentConfigDraft({
        api_key: "",
        model: config.model ?? "",
        report_read_timeout: config.report_read_timeout,
      });
    } catch {
      setStatus(UI_TEXT.en.backendMissing);
    }
  }

  async function saveAgentConfig() {
    if (!agentConfig) {
      return;
    }
    const model = String(agentConfigDraft.model ?? "").trim();
    const apiKey = String(agentConfigDraft.api_key ?? "").trim();
    const timeout = Number(agentConfigDraft.report_read_timeout);
    try {
      const payload: AgentConfigUpdate = {
        model,
        report_read_timeout: Number.isFinite(timeout) ? timeout : agentConfig.report_read_timeout,
      };
      if (apiKey) {
        payload.api_key = apiKey;
      }
      const updated = await client.updateAgentConfig(payload);
      setAgentConfig(updated);
      setAgentStatus({
        configured: updated.configured,
        has_api_key: updated.has_api_key,
        mode: updated.mode,
        model: updated.model,
      });
      setAgentConfigDraft({
        api_key: "",
        model: updated.model ?? "",
        report_read_timeout: updated.report_read_timeout,
      });
      setAgentConfigMessage(text.agentConfigSaved);
    } catch {
      setAgentConfigMessage(text.agentConfigFailed);
    }
  }

  function acceptImportedSession(session: PaperSession) {
    setImportNotice(session.duplicate_warning ?? null);
    setImportActivity({
      stage: "queued",
      title: session.paper.title,
    });
    setPapers((current) => [
      session.paper,
      ...current.filter(
        (p) =>
          p.id !== session.paper.id &&
          p.id !== session.duplicate_of?.id &&
          p.title !== session.paper.title,
      ),
    ]);
    setSelectedPaper(session.paper);
    void pollPaper(session.paper.id);
  }

  function showImportFailure(title: string | undefined, message: string) {
    setError(null);
    setImportActivity({ stage: "failed", title, message });
  }

  async function handleImport(file: File) {
    setError(null);
    setStatus(UI_TEXT.en.queuedStatus);
    setImportActivity({ stage: "uploading", title: file.name });
    try {
      const session = await client.importPaper(file);
      acceptImportedSession(session);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : text.importFailed;
      setStatus(UI_TEXT.en.importFailed);
      showImportFailure(file.name, message);
    }
  }

  async function handleArxivImport() {
    const value = arxivInput.trim();
    if (!value) {
      setError(text.emptyArxiv);
      return;
    }
    setError(null);
    setStatus(UI_TEXT.en.arxivQueuedStatus);
    setImportActivity({ stage: "downloading", title: value });
    try {
      const session = await client.importArxiv(value);
      acceptImportedSession(session);
      setArxivInput("");
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : text.importFailed;
      setStatus(UI_TEXT.en.importFailed);
      showImportFailure(value, message);
    }
  }

  async function handleUrlImport() {
    const value = urlInput.trim();
    if (!value) {
      setError(text.emptyUrl);
      return;
    }
    setError(null);
    setStatus(UI_TEXT.en.urlQueuedStatus);
    setImportActivity({ stage: "resolving", title: value });
    try {
      const session = await client.importUrl(value);
      acceptImportedSession(session);
      setUrlInput("");
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : text.importFailed;
      setStatus(UI_TEXT.en.importFailed);
      showImportFailure(value, message);
    }
  }

  async function handleZoteroImport() {
    setError(null);
    setImportActivity({ stage: "resolving", title: "Zotero" });
    try {
      const result = await client.importZotero();
      if (result.imported === 0) {
        setStatus(UI_TEXT.en.zoteroEmpty);
        setImportActivity(null);
        return;
      }
      setStatus(UI_TEXT.en.zoteroImported(result.imported));
      setImportActivity({
        stage: "queued",
        message:
          locale === "zh"
            ? `已从 Zotero 接收 ${result.imported} 篇论文，正在解析。`
            : `Received ${result.imported} Zotero paper(s), parsing now.`,
      });
      await refreshLibrary();
      result.sessions.forEach((session) => {
        void pollPaper(session.paper.id);
      });
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : text.importFailed;
      showImportFailure("Zotero", message);
    }
  }

  async function openPaper(paper: Paper) {
    setSelectedPaper(paper);
    if (reports[paper.id]) {
      return;
    }
    if (paper.status?.stage !== "completed") {
      if (paper.status?.stage !== "failed") {
        void pollPaper(paper.id);
      }
      return;
    }
    try {
      const report = await client.getReport(paper.id);
      setReports((current) => ({ ...current, [paper.id]: report }));
      if (report.paper_title) {
        updatePaperTitle(paper.id, report.paper_title);
      }
    } catch {
      setStatus(UI_TEXT.en.reportUnavailable);
    }
  }

  async function deletePaper(paper: Paper) {
    if (pendingDeleteId !== paper.id) {
      setPendingDeleteId(paper.id);
      return;
    }
    setError(null);
    try {
      await client.deletePaper(paper.id);
      setPendingDeleteId(null);
      setPapers((current) => current.filter((candidate) => candidate.id !== paper.id));
      setReports((current) => {
        const next = { ...current };
        delete next[paper.id];
        return next;
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : text.deleteFailed);
    }
  }

  async function pollPaper(paperId: string) {
    for (let attempt = 0; attempt < 240; attempt += 1) {
      const nextStatus = await client.getStatus(paperId);
      updatePaperStatus(paperId, nextStatus);
      setStatus(nextStatus.message);
      if (attempt === 0) {
        setImportActivity((current) =>
          current?.title
            ? { ...current, stage: "processing", title: current.title }
            : current,
        );
      }
      if (attempt === 20) {
        setImportActivity((current) =>
          current?.title ? { ...current, stage: "slow", title: current.title } : current,
        );
      }
      if (nextStatus.stage === "completed") {
        const report = await client.getReport(paperId);
        setReports((current) => ({ ...current, [paperId]: report }));
        if (report.paper_title) {
          updatePaperTitle(paperId, report.paper_title);
        }
        setImportActivity({
          stage: "completed",
          title: report.paper_title ?? papers.find((paper) => paper.id === paperId)?.title,
        });
        return;
      }
      if (nextStatus.stage === "processing") {
        try {
          const partialReport = await client.getReport(paperId);
          setReports((current) => ({ ...current, [paperId]: partialReport }));
          if (partialReport.paper_title) {
            updatePaperTitle(paperId, partialReport.paper_title);
          }
        } catch {
          // A partial report appears only after the first chunk finishes.
        }
      }
      if (nextStatus.stage === "failed") {
        showImportFailure(
          papers.find((paper) => paper.id === paperId)?.title,
          nextStatus.message,
        );
        return;
      }
      await sleep(1500);
    }
    setStatus(UI_TEXT.en.parseTimeout);
    showImportFailure(
      papers.find((paper) => paper.id === paperId)?.title,
      text.parseTimeout,
    );
  }

  function updatePaperStatus(paperId: string, nextStatus: TaskStatus) {
    setPapers((current) =>
      current.map((paper) =>
        paper.id === paperId ? { ...paper, status: nextStatus } : paper,
      ),
    );
    setSelectedPaper((current) =>
      current?.id === paperId ? { ...current, status: nextStatus } : current,
    );
  }

  async function rerunPaper(paperId: string) {
    setError(null);
    try {
      const session = await client.rerunAgent(paperId);
      updatePaperStatus(paperId, session.status);
      setReports((current) => {
        const next = { ...current };
        delete next[paperId];
        return next;
      });
      void pollPaper(paperId);
    } catch (err) {
      setError(err instanceof Error ? err.message : text.importFailed);
    }
  }

  function updatePaperNote(paperId: string, notePath: string) {
    setPapers((current) =>
      current.map((paper) =>
        paper.id === paperId ? { ...paper, note_path: notePath } : paper,
      ),
    );
    setSelectedPaper((current) =>
      current?.id === paperId ? { ...current, note_path: notePath } : current,
    );
  }

  function updatePaperTitle(paperId: string, title: string) {
    setPapers((current) =>
      current.map((paper) =>
        paper.id === paperId ? { ...paper, title } : paper,
      ),
    );
    setSelectedPaper((current) =>
      current?.id === paperId ? { ...current, title } : current,
    );
  }

  if (selectedPaper) {
    return (
      <Workspace
        client={client}
        onBack={() => setSelectedPaper(null)}
        locale={locale}
        agentConfig={agentConfig}
        agentConfigDraft={agentConfigDraft}
        agentConfigMessage={agentConfigMessage}
        agentStatus={agentStatus}
        importActivity={importActivity}
        importNotice={importNotice}
        onAgentConfigChange={setAgentConfigDraft}
        onAgentConfigSave={() => void saveAgentConfig()}
        onLocaleToggle={() => setLocale(locale === "zh" ? "en" : "zh")}
        onNoteSaved={(notePath) => updatePaperNote(selectedPaper.id, notePath)}
        onRerun={() => void rerunPaper(selectedPaper.id)}
        paper={selectedPaper}
        report={reports[selectedPaper.id]}
      />
    );
  }

  const displayedStatus = buildLibraryStatus(papers, status, locale);

  return (
    <main className="home">
      <TopNav
        agentStatus={agentStatus}
        locale={locale}
        mode="home"
        onLocaleToggle={() => setLocale(locale === "zh" ? "en" : "zh")}
      />
      <header className="masthead">
        <div>
          <p className="eyebrow">{text.eyebrow}</p>
          <h1 className="masthead-title">{text.libraryTitle}</h1>
          <p className="masthead-standfirst">{text.heroDescription}</p>
        </div>
      </header>

      <section className="import-drawer" id="import">
        <div className="import-drawer-head">
          <h2 className="label-section">{text.importsLabel}</h2>
        </div>
        <div className="import-grid">
          <div className="import-field import-field-pdf">
            <h3 className="import-field-title">{text.importPdf}</h3>
            <p className="import-field-hint">{text.importPdfHint}</p>
            <input
              aria-label={text.importPdf}
              accept="application/pdf"
              type="file"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  void handleImport(file);
                }
              }}
            />
          </div>

          <div className="import-field">
            <h3 className="import-field-title">{text.arxivImportTitle}</h3>
            <p className="import-field-hint">{text.arxivPlaceholder}</p>
            <div className="import-row">
              <input
                aria-label={text.arxivImportTitle}
                placeholder={text.arxivPlaceholder}
                value={arxivInput}
                onChange={(event) => setArxivInput(event.target.value)}
              />
              <button
                type="button"
                className="btn-ghost"
                onClick={() => void handleArxivImport()}
              >
                {text.importArxiv}
              </button>
            </div>
          </div>

          <div className="import-field">
            <h3 className="import-field-title">{text.urlImportTitle}</h3>
            <p className="import-field-hint">{text.urlPlaceholder}</p>
            <div className="import-row">
              <input
                aria-label={text.urlImportTitle}
                placeholder={text.urlPlaceholder}
                value={urlInput}
                onChange={(event) => setUrlInput(event.target.value)}
              />
              <button
                type="button"
                className="btn-ghost"
                onClick={() => void handleUrlImport()}
              >
                {text.importUrl}
              </button>
            </div>
          </div>

          <div className="import-field">
            <h3 className="import-field-title">{text.zoteroImportTitle}</h3>
            <p className="import-field-hint mono">{text.zoteroPath}</p>
            <div className="import-row">
              <button
                type="button"
                className="btn-ghost"
                onClick={() => void handleZoteroImport()}
              >
                {text.zoteroImportButton}
              </button>
            </div>
          </div>
        </div>
      </section>

      <AgentConfigPanel
        config={agentConfig}
        draft={agentConfigDraft}
        locale={locale}
        message={agentConfigMessage}
        onChange={setAgentConfigDraft}
        onSave={() => void saveAgentConfig()}
      />

      {error ? <p className="warning-line">{error}</p> : null}
      {importNotice ? <p className="notice-line">{importNotice}</p> : null}
      <ImportActivityBanner activity={importActivity} locale={locale} />

      <section className="paper-section" id="papers">
        <div className="paper-section-head">
          <h2 className="label-section">{text.recentPapers}</h2>
          <span className="count">{text.paperCount(papers.length)}</span>
        </div>
        {papers.length === 0 ? (
          <p className="paper-list-empty">
            {locale === "zh"
              ? "文献库还是空的。导入第一篇 PDF / arXiv / URL 开始。"
              : "Library is empty. Import a PDF, arXiv link, or URL to begin."}
          </p>
        ) : (
          <ol className="paper-list">
            {papers.map((paper, idx) => (
              <li className="paper-row" key={paper.id}>
                <span className="paper-ord">
                  {String(idx + 1).padStart(2, "0")}
                </span>
                <div className="paper-body">
                  <h3 className="paper-title">{paper.title}</h3>
                  <PaperMetadataLine paper={paper} />
                  <p className="paper-path">{paper.pdf_path}</p>
                  <PaperProcessingLine locale={locale} paper={paper} />
                  {paper.note_path ? (
                    <p className="paper-note-line">
                      {text.notePrefix} <span className="mono">{paper.note_path}</span>
                    </p>
                  ) : null}
                </div>
                <div className="paper-actions">
                  <StatusBadge locale={locale} status={paper.status} />
                  <button
                    type="button"
                    className={`btn-secondary ${pendingDeleteId === paper.id ? "is-danger" : ""}`}
                    aria-label={
                      pendingDeleteId === paper.id
                        ? text.confirmDeletePaper(paper.title)
                        : text.deletePaper(paper.title)
                    }
                    onClick={() => void deletePaper(paper)}
                  >
                    {pendingDeleteId === paper.id
                      ? text.confirmDeletePaperAction
                      : text.deletePaperAction}
                  </button>
                  <button
                    type="button"
                    className="btn-ghost"
                    aria-label={text.agentifyPaper(paper.title)}
                    disabled={isPaperAgentActive(paper)}
                    onClick={() => void rerunPaper(paper.id)}
                  >
                    {text.agentifyPaperAction}
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    aria-label={text.openPaper(paper.title)}
                    onClick={() => void openPaper(paper)}
                  >
                    {text.openPaperAction}
                  </button>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      <footer className="footer-strip">
        <div className="footer-block">
          <h2 className="label-section">{text.processingStatus}</h2>
          <p>{displayedStatus}</p>
        </div>
        <div className="footer-block">
          <h2 className="label-section">{text.savedReports}</h2>
          <ul className="saved-reports-list">
            {papers.length === 0 ? (
              <li className="empty">{text.noNote}</li>
            ) : (
              papers.map((paper) => (
                <li
                  key={paper.id}
                  className={paper.note_path ? "" : "empty"}
                >
                  <span className="saved-report-title">{paper.title}</span>
                  <span className="saved-report-path">
                    {paper.note_path ?? text.noNote}
                  </span>
                </li>
              ))
            )}
          </ul>
        </div>
      </footer>
    </main>
  );
}

/* ============================================================================
   Workspace
   ============================================================================ */

function TopNav({
  agentStatus,
  currentTitle,
  locale,
  mode,
  onBack,
  onLocaleToggle,
}: {
  agentStatus: AgentStatus | null;
  currentTitle?: string;
  locale: Locale;
  mode: "home" | "workspace";
  onBack?: () => void;
  onLocaleToggle: () => void;
}) {
  const text = UI_TEXT[locale];
  return (
    <nav className="top-nav" aria-label={locale === "zh" ? "全局导航" : "Global navigation"}>
      <div className="top-nav-brand">
        <a href={mode === "home" ? "#import" : "#report"}>Paperflow</a>
        <span>{mode === "home" ? text.librarySection : (currentTitle ?? text.readingReport)}</span>
      </div>
      <div className="top-nav-links">
        {mode === "workspace" && onBack ? (
          <button type="button" className="top-nav-back" onClick={onBack}>
            {text.backToLibrary}
          </button>
        ) : null}
        {mode === "home" ? (
          <>
            <a href="#import">{text.navImport}</a>
            <a href="#papers">{text.navPapers}</a>
          </>
        ) : (
          <>
            <a href="#report">{text.navReport}</a>
            <a href="#field-map">{text.navFieldMap}</a>
            <a href="#agent-chat">{text.navAgent}</a>
          </>
        )}
        <span
          className={`agent-chip ${agentStatus?.configured ? "ready" : "missing"}`}
        >
          {text.agentLabel} ·{" "}
          {agentStatus?.configured
            ? `${text.configured} (${agentStatus.mode})`
            : text.missingKey}
        </span>
        <button type="button" className="language-toggle" onClick={onLocaleToggle}>
          {text.languageToggle}
        </button>
      </div>
    </nav>
  );
}

function Workspace({
  paper,
  report,
  client,
  locale,
  agentConfig,
  agentConfigDraft,
  agentConfigMessage,
  agentStatus,
  importActivity,
  importNotice,
  onAgentConfigChange,
  onAgentConfigSave,
  onLocaleToggle,
  onNoteSaved,
  onRerun,
  onBack,
}: {
  paper: Paper;
  report?: ReadingReport;
  client: PaperflowClient;
  locale: Locale;
  agentConfig: AgentConfig | null;
  agentConfigDraft: AgentConfigUpdate;
  agentConfigMessage: string | null;
  agentStatus: AgentStatus | null;
  importActivity: ImportActivity | null;
  importNotice?: string | null;
  onAgentConfigChange: (draft: AgentConfigUpdate) => void;
  onAgentConfigSave: () => void;
  onLocaleToggle: () => void;
  onNoteSaved: (notePath: string) => void;
  onRerun: () => void;
  onBack: () => void;
}) {
  const text = UI_TEXT[locale];
  const displayTitle = report?.paper_title ?? paper.title;
  const [chat, setChat] = useState<PaperChatResponse | null>(null);
  const [chatStatus, setChatStatus] = useState<ChatPanelStatus>("idle");
  const [notePath, setNotePath] = useState<string | null>(paper.note_path ?? null);
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(
    report?.summary[0] ?? null,
  );
  const [activeEvidence, setActiveEvidence] = useState<Evidence | null>(
    report?.summary[0]?.evidence?.[0] ?? null,
  );
  const [pdfViewerOpen, setPdfViewerOpen] = useState(true);
  const [pdfPage, setPdfPage] = useState(1);
  const [pdfColumnWidth, setPdfColumnWidth] = useState(loadStoredPdfWidth);
  const [reportColumnWidth, setReportColumnWidth] = useState(loadStoredReportWidth);
  const [railWidth, setRailWidth] = useState(loadStoredRailWidth);
  const pdfColumnWidthRef = useRef(pdfColumnWidth);
  const reportColumnWidthRef = useRef(reportColumnWidth);
  const railWidthRef = useRef(railWidth);
  const [r1Running, setR1Running] = useState(false);
  const [r1Error, setR1Error] = useState<string | null>(null);
  const [r1Trace, setR1Trace] = useState<R1QueryTraceEntry[]>([]);
  const [relatedOverride, setRelatedOverride] = useState<RelatedWorkItem[] | null>(
    null,
  );
  const [fieldMap, setFieldMap] = useState<FieldMap | null>(null);
  const [fieldMapRunning, setFieldMapRunning] = useState(false);
  const [fieldMapError, setFieldMapError] = useState<string | null>(null);

  const isReportReady = paper.status?.stage === "completed";
  const pdfUrl = useMemo(() => client.pdfUrl(paper.id), [client, paper.id]);
  const railStyle = {
    "--col-pdf": `${pdfColumnWidth}px`,
    "--col-report": `${reportColumnWidth}px`,
    "--col-rail": `${railWidth}px`,
  } as CSSProperties;

  useEffect(() => {
    pdfColumnWidthRef.current = pdfColumnWidth;
  }, [pdfColumnWidth]);

  useEffect(() => {
    reportColumnWidthRef.current = reportColumnWidth;
  }, [reportColumnWidth]);

  useEffect(() => {
    railWidthRef.current = railWidth;
  }, [railWidth]);

  useEffect(() => {
    if (!selectedClaim && report?.summary[0]) {
      setSelectedClaim(report.summary[0]);
    }
  }, [report, selectedClaim]);

  useEffect(() => {
    let cancelled = false;
    client
      .listChats(paper.id)
      .then((chats) => {
        if (!cancelled && chats.length > 0) {
          const latest = chats[0];
          setChat(latest);
          setChatStatus(latest.status === "failed" ? "failed" : "completed");
        }
      })
      .catch(() => {
        /* Chat history is optional for older backends. */
      });
    return () => {
      cancelled = true;
    };
  }, [client, paper.id]);

  // When the user selects a claim, jump the PDF viewer to the first evidence
  // page so the highlight is immediately visible.
  useEffect(() => {
    const firstEvidence = selectedClaim?.evidence?.[0];
    if (firstEvidence?.page) {
      setPdfPage(firstEvidence.page);
    }
    setActiveEvidence(firstEvidence ?? null);
  }, [selectedClaim]);

  const highlight: PdfBboxHighlight | null = (() => {
    const first = activeEvidence ?? selectedClaim?.evidence?.[0];
    if (!first?.page) return null;
    return {
      page: first.page,
      bbox: first.bbox ?? (first.quote ? null : PDF_PAGE_FALLBACK_HIGHLIGHT_BBOX),
      quote: first.quote ?? null,
    };
  })();

  function openEvidenceInPdf(evidence: Evidence) {
    setActiveEvidence(evidence);
    if (evidence.page) {
      setPdfPage(evidence.page);
    }
    setPdfViewerOpen(true);
  }

  function startPdfReportResize(event: ReactPointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    const startX = event.clientX;
    const startPdfWidth = pdfColumnWidthRef.current;
    const startReportWidth = reportColumnWidthRef.current;
    document.body.classList.add("is-resizing-workspace");

    const handleMove = (moveEvent: PointerEvent) => {
      const delta = clampResizeDelta(
        moveEvent.clientX - startX,
        startPdfWidth,
        startReportWidth,
        PDF_WIDTH_MIN,
        clampPdfWidth(PDF_WIDTH_MAX),
        REPORT_WIDTH_MIN,
        clampReportWidth(REPORT_WIDTH_MAX),
      );
      const nextPdfWidth = clampPdfWidth(startPdfWidth + delta);
      const nextReportWidth = clampReportWidth(startReportWidth - delta);
      pdfColumnWidthRef.current = nextPdfWidth;
      reportColumnWidthRef.current = nextReportWidth;
      setPdfColumnWidth(nextPdfWidth);
      setReportColumnWidth(nextReportWidth);
    };
    const handleUp = () => {
      document.body.classList.remove("is-resizing-workspace");
      savePdfWidth(pdfColumnWidthRef.current);
      saveReportWidth(reportColumnWidthRef.current);
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleUp);
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointercancel", handleUp);
  }

  function startRailResize(event: ReactPointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    const startX = event.clientX;
    const startReportWidth = reportColumnWidthRef.current;
    const startWidth = railWidthRef.current;
    document.body.classList.add("is-resizing-workspace");

    const handleMove = (moveEvent: PointerEvent) => {
      const delta = clampResizeDelta(
        moveEvent.clientX - startX,
        startReportWidth,
        startWidth,
        REPORT_WIDTH_MIN,
        clampReportWidth(REPORT_WIDTH_MAX),
        RAIL_WIDTH_MIN,
        clampRailWidth(RAIL_WIDTH_MAX),
      );
      const nextReportWidth = clampReportWidth(startReportWidth + delta);
      const nextWidth = clampRailWidth(startWidth - delta);
      reportColumnWidthRef.current = nextReportWidth;
      railWidthRef.current = nextWidth;
      setReportColumnWidth(nextReportWidth);
      setRailWidth(nextWidth);
    };
    const handleUp = () => {
      document.body.classList.remove("is-resizing-workspace");
      saveReportWidth(reportColumnWidthRef.current);
      saveRailWidth(railWidthRef.current);
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleUp);
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointercancel", handleUp);
  }

  async function askAgentChat(question: string) {
    if (!question.trim()) {
      return;
    }
    const firstEvidence = selectedClaim?.evidence?.[0];
    const userQuestion = question;
    setChatStatus("running");
    setChat({
      id: `local-${Date.now()}`,
      paper_id: paper.id,
      status: "running",
      steps: [
        { id: "read-report", label: "Read report", status: "running" },
        { id: "locate-evidence", label: "Locate evidence", status: "pending" },
        { id: "check-r1", label: "Check R1 context", status: "pending" },
        { id: "web-search", label: "Web search", status: "pending" },
        { id: "compose-answer", label: "Compose answer", status: "pending" },
        { id: "persist-transcript", label: "Persist transcript", status: "pending" },
      ],
      messages: [{ id: `user-${Date.now()}`, role: "user", content: userQuestion }],
      answer: {
        id: "pending",
        text: "",
        reliability: "R2",
        evidence: [],
      },
    });
    const payload = {
      question: userQuestion,
      selected_claim_id: selectedClaim?.id ?? null,
      selected_evidence_id: firstEvidence?.id ?? null,
      page: firstEvidence?.page ?? null,
      quote: firstEvidence?.quote ?? null,
      section: firstEvidence?.section ?? null,
    };
    try {
      let result: PaperChatResponse | null = null;
      await client.streamChatPaper(paper.id, payload, ({ event, data }) => {
        if (event === "step" && data && typeof data === "object") {
          const nextStep = data as PaperChatResponse["steps"][number];
          setChat((current) =>
            current
              ? {
                  ...current,
                  steps: current.steps.map((step) =>
                    step.id === nextStep.id ? { ...step, ...nextStep } : step,
                  ),
                }
              : current,
          );
        }
        if (event === "delta" && data && typeof data === "object") {
          const text = String((data as { text?: string }).text ?? "");
          setChat((current) =>
            current
              ? {
                  ...current,
                  messages: [
                    ...current.messages.filter((message) => message.id !== "stream-assistant"),
                    { id: "stream-assistant", role: "assistant", content: text },
                  ],
                }
              : current,
          );
        }
        if (event === "final" && data && typeof data === "object") {
          result = (data as { chat_response?: PaperChatResponse }).chat_response ?? null;
        }
      });
      if (result === null) {
        result = await client.chatPaper(paper.id, payload);
      }
      setChat(result);
      setChatStatus("completed");
    } catch {
      setChatStatus("failed");
      setChat((current) =>
        current
          ? {
              ...current,
              status: "failed",
              steps: current.steps.map((step) =>
                step.status === "running" ? { ...step, status: "failed" } : step,
              ),
            }
          : null,
      );
    }
  }

  async function askSelection(quote: string, page: number) {
    if (!quote.trim()) return;
    try {
      const result = await client.askSelection(paper.id, { quote, page });
      setChat({
        id: `selection-${Date.now()}`,
        paper_id: paper.id,
        status: "completed",
        steps: [
          { id: "read-report", label: "Read report", status: "completed" },
          { id: "locate-evidence", label: "Locate evidence", status: "completed" },
          { id: "compose-answer", label: "Compose answer", status: "completed" },
        ],
        messages: [
          { id: `user-selection-${Date.now()}`, role: "user", content: quote },
          {
            id: `assistant-selection-${Date.now()}`,
            role: "assistant",
            content: result.text,
            reliability: result.reliability,
            evidence: result.evidence,
            uncertainty: result.uncertainty,
          },
        ],
        answer: result,
      });
      setChatStatus("completed");
    } catch {
      /* swallow */
    }
  }

  async function exportNote() {
    const result = await client.exportObsidian(paper.id);
    setNotePath(result.note_path);
    onNoteSaved(result.note_path);
  }

  async function runR1Search() {
    setR1Running(true);
    setR1Error(null);
    try {
      const result = await client.runR1Search(paper.id);
      setRelatedOverride(result.items);
      setR1Trace(result.query_trace || []);
    } catch (caught) {
      setR1Error(
        caught instanceof Error ? caught.message : "R1 search failed",
      );
    } finally {
      setR1Running(false);
    }
  }

  async function buildFieldMap() {
    setFieldMapRunning(true);
    setFieldMapError(null);
    try {
      const fm = fieldMap
        ? await client.rerunFieldMap(fieldMap.id)
        : await client.createFieldMap(paper.id);
      setFieldMap(fm);
    } catch (caught) {
      setFieldMapError(
        caught instanceof Error ? caught.message : "Field Map failed",
      );
    } finally {
      setFieldMapRunning(false);
    }
  }

  if (!report) {
    return (
      <main className="workspace" style={railStyle}>
        <TopNav
          agentStatus={agentStatus}
          currentTitle={displayTitle}
          locale={locale}
          mode="workspace"
          onBack={onBack}
          onLocaleToggle={onLocaleToggle}
        />
        <section className="workspace-main">
          {importNotice ? <p className="notice-line">{importNotice}</p> : null}
          <ImportActivityBanner activity={importActivity} locale={locale} />
          <div className="empty-report">
            <h2 className="eyebrow">{text.readingReport}</h2>
            <h1>{displayTitle}</h1>
            <StatusBadge locale={locale} status={paper.status} />
            <p>
              {paper.status?.message
                ? localizeTaskMessage(paper.status.message, locale)
                : text.reportNotReady}
            </p>
          </div>
          <AgentParseTrace locale={locale} paper={paper} />
        </section>
        <Rail
          agentConfig={agentConfig}
          agentConfigDraft={agentConfigDraft}
          agentConfigMessage={agentConfigMessage}
          chat={chat}
          chatStatus={chatStatus}
          locale={locale}
          notePath={notePath}
          onAgentConfigChange={onAgentConfigChange}
          onAgentConfigSave={onAgentConfigSave}
          onAsk={askAgentChat}
          onExport={exportNote}
          onEvidenceOpen={openEvidenceInPdf}
          onRerun={onRerun}
          onResizeStart={startRailResize}
          paper={paper}
          selectedClaim={selectedClaim}
        />
      </main>
    );
  }

  const related = relatedOverride ?? report.related_work;
  const workspaceClass = pdfViewerOpen && isReportReady ? "workspace workspace-has-pdf" : "workspace";
  const pdfWorkspacePane =
    pdfViewerOpen && isReportReady ? (
      <section className="workspace-pdf-pane" aria-label="PDF workspace">
        <div className="workspace-pdf-head">
          <div>
            <p className="label-section">{text.pdfPanel}</p>
            <p className="workspace-pdf-meta">
              {highlight?.page
                ? `${text.page(highlight.page)} · ${locale === "zh" ? "证据定位" : "evidence focus"}`
                : paper.pdf_path}
            </p>
          </div>
          <button
            type="button"
            className="btn-link"
            onClick={() => setPdfViewerOpen(false)}
          >
            {text.disableViewer}
          </button>
        </div>
        <section className="pdf-viewer-shell">
          <PdfViewer
            pdfUrl={pdfUrl}
            page={pdfPage}
            highlight={highlight}
            onPageChange={setPdfPage}
            onSelection={(quote, page) => void askSelection(quote, page)}
          />
        </section>
      </section>
    ) : null;

  return (
    <main className={workspaceClass} style={railStyle}>
      <TopNav
        agentStatus={agentStatus}
        currentTitle={displayTitle}
        locale={locale}
        mode="workspace"
        onBack={onBack}
        onLocaleToggle={onLocaleToggle}
      />
      {pdfWorkspacePane}
      {pdfViewerOpen && isReportReady ? (
        <button
          type="button"
          className="workspace-resize-handle workspace-resize-handle-pdf"
          aria-label="Resize PDF and report columns"
          title={locale === "zh" ? "拖动调整 PDF / 报告宽度" : "Resize PDF / report columns"}
          onPointerDown={startPdfReportResize}
        />
      ) : null}
      <section className="workspace-main">
        {importNotice ? <p className="notice-line">{importNotice}</p> : null}
        <ImportActivityBanner activity={importActivity} locale={locale} />

        <header className="report-head" id="report">
          <h2 className="eyebrow">{text.readingReport}</h2>
          <h1>{displayTitle}</h1>
          <p className="path-line">{paper.pdf_path}</p>
          <ReportRunMetrics isLive={!isReportReady} report={report} />
          {!isReportReady ? (
            <p className="report-run-metrics">报告仍在动态生成中</p>
          ) : null}
          <div className="report-head-tools">
            <StatusBadge locale={locale} status={paper.status} />
            {isReportReady ? (
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setPdfViewerOpen((v) => !v)}
              >
                {pdfViewerOpen ? text.disableViewer : text.enableViewer}
              </button>
            ) : null}
            <a className="btn-ghost" href="#agent-chat">
              {text.jumpToAgent}
            </a>
            <button type="button" className="btn-ghost" onClick={onRerun}>
              {text.rerunAgent}
            </button>
            <button type="button" className="btn-ghost" onClick={() => void exportNote()}>
              {text.saveNote}
            </button>
          </div>
        </header>

        {report.summary.length > 0 ? (
          <section className="report-section">
            <div className="section-head">
              <h3>{text.executiveSummary}</h3>
            </div>
            <ol className="claim-list">
              {report.summary.map((claim, idx) => (
                <ClaimItem
                  claim={claim}
                  key={claim.id}
                  locale={locale}
                  ord={idx + 1}
                  selected={selectedClaim?.id === claim.id}
                  onSelect={setSelectedClaim}
                />
              ))}
            </ol>
          </section>
        ) : null}

        {report.sections.map((section) => (
          <section className="report-section" key={section.id}>
            <div className="section-head">
              <h3>{localizeSectionTitle(section.title, locale)}</h3>
            </div>
            <ol className="claim-list">
              {section.claims.map((claim, idx) => (
                <ClaimItem
                  claim={claim}
                  key={claim.id}
                  locale={locale}
                  ord={idx + 1}
                  selected={selectedClaim?.id === claim.id}
                  onSelect={setSelectedClaim}
                />
              ))}
            </ol>
          </section>
        ))}

        <section className="report-section">
          <div className="section-head">
            <h3>{text.relatedWork}</h3>
            <div className="section-head-actions">
              <button
                type="button"
                className="btn-ghost"
                onClick={() => void runR1Search()}
                disabled={r1Running}
              >
                {r1Running ? text.r1Running : text.r1RunSearch}
              </button>
            </div>
          </div>
          {r1Error ? (
            <p className="warning-line">
              {text.r1Failed}
              {r1Error}
            </p>
          ) : null}
          <ol className="related-list">
            {related.map((item, idx) => (
              <RelatedItem
                item={item}
                key={item.id}
                locale={locale}
                ord={idx + 1}
              />
            ))}
          </ol>
          {r1Trace.length > 0 ? (
            <details className="r1-trace">
              <summary>{text.r1QueryTrace}</summary>
              <ul>
                {r1Trace.map((entry, idx) => (
                  <li key={`${entry.lane}-${idx}`}>
                    <code>
                      [{entry.lane}/{entry.source}]
                    </code>
                    <span>{entry.query}</span>
                    <span className="trace-count">{entry.count}</span>
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </section>

        <FieldMapSection
          fieldMap={fieldMap}
          running={fieldMapRunning}
          error={fieldMapError}
          locale={locale}
          onGenerate={() => void buildFieldMap()}
        />
      </section>

      {pdfViewerOpen && isReportReady ? (
        <button
          type="button"
          className="workspace-resize-handle workspace-resize-handle-rail"
          aria-label="Resize Agent rail"
          title={locale === "zh" ? "拖动调整报告 / Agent 宽度" : "Resize report / Agent columns"}
          onPointerDown={startRailResize}
        />
      ) : null}

      <Rail
        agentConfig={agentConfig}
        agentConfigDraft={agentConfigDraft}
        agentConfigMessage={agentConfigMessage}
        chat={chat}
        chatStatus={chatStatus}
        locale={locale}
        notePath={notePath}
        onAgentConfigChange={onAgentConfigChange}
        onAgentConfigSave={onAgentConfigSave}
        onAsk={askAgentChat}
        onExport={exportNote}
        onEvidenceOpen={openEvidenceInPdf}
        onRerun={onRerun}
        onResizeStart={startRailResize}
        paper={paper}
        selectedClaim={selectedClaim}
      />
    </main>
  );
}

/* ============================================================================
   Pieces
   ============================================================================ */

function ImportActivityBanner({
  activity,
  locale,
}: {
  activity: ImportActivity | null;
  locale: Locale;
}) {
  if (!activity) {
    return null;
  }
  const message = importActivityMessage(activity, locale);
  return (
    <section className={`import-activity is-${activity.stage}`} aria-live="polite">
      <div>
        <p className="label-section">
          {locale === "zh" ? "处理反馈" : "Processing Feedback"}
        </p>
        <p className="import-activity-message">{message}</p>
      </div>
      <span className="import-activity-pulse" aria-hidden="true" />
    </section>
  );
}

function AgentParseTrace({ locale, paper }: { locale: Locale; paper: Paper }) {
  const status = paper.status;
  if (!status || status.stage === "completed") {
    return null;
  }
  const isFailed = status.stage === "failed";
  const isProcessing = status.stage === "processing";
  const isQueued = status.stage === "queued";
  const labels =
    locale === "zh"
      ? {
          title: "Agent 解析过程",
          hint: "这些是当前任务阶段的轻量过程输出，用来说明 Agent 卡在哪里。",
          received: "接收论文",
          prepare: "准备 PDF 文本与上下文",
          model: "等待 DeepSeek 生成阅读报告",
          persist: "写入报告与证据定位",
          done: "完成",
          running: "进行中",
          pending: "等待",
          failed: "失败点",
          receivedDetail: "PDF / 元数据已进入本地任务队列。",
          prepareDetail: "正在抽取可读文本、构造 Reading Report 上下文。",
          deepSeekPrepareDetail: (coverage: string) =>
            `文本已抽取；请求已组装。${coverage}。`,
          modelDetail: "模型需要返回结构化 JSON、R0/R1/R2 和证据。",
          persistDetail: "报告生成后会落盘，并尝试定位 evidence 页码与位置。",
        }
      : {
          title: "Agent Parsing Trace",
          hint: "A lightweight trace of the current parsing stage.",
          received: "Receive paper",
          prepare: "Prepare PDF text and context",
          model: "Wait for DeepSeek reading report",
          persist: "Save report and locate evidence",
          done: "done",
          running: "running",
          pending: "pending",
          failed: "failed here",
          receivedDetail: "PDF / metadata entered the local task queue.",
          prepareDetail: "Extracting readable text and report context.",
          deepSeekPrepareDetail: (coverage: string) =>
            `Text extracted; DeepSeek report request prepared. ${coverage}.`,
          modelDetail: "The model must return structured JSON, R0/R1/R2, and evidence.",
          persistDetail: "The report is saved and evidence locations are resolved after generation.",
        };
  const deepSeekProgress = parseDeepSeekProgressMessage(status.message);
  const inputCoverage = deepSeekProgress
    ? formatDeepSeekInputCoverage(deepSeekProgress.input, locale)
    : null;
  const steps = [
    {
      id: "received",
      title: labels.received,
      detail: labels.receivedDetail,
      state: "completed",
    },
    {
      id: "prepare",
      title: labels.prepare,
      detail: inputCoverage
        ? labels.deepSeekPrepareDetail(inputCoverage)
        : labels.prepareDetail,
      state: isQueued ? "running" : "completed",
    },
    {
      id: "model",
      title: labels.model,
      detail:
        isFailed || (isProcessing && isDeepSeekProgressMessage(status.message))
          ? localizeTaskMessage(status.message, locale)
          : labels.modelDetail,
      state: isFailed ? "failed" : isProcessing ? "running" : "pending",
    },
    {
      id: "persist",
      title: labels.persist,
      detail: labels.persistDetail,
      state: isFailed ? "pending" : isProcessing ? "pending" : "pending",
    },
  ];
  const statusLabel = (state: string) => {
    if (state === "completed") return labels.done;
    if (state === "running") return labels.running;
    if (state === "failed") return labels.failed;
    return labels.pending;
  };
  return (
    <section className="agent-parse-trace" aria-label={labels.title}>
      <div className="agent-parse-trace-head">
        <h3>{labels.title}</h3>
        <p>{labels.hint}</p>
      </div>
      <ol>
        {steps.map((step) => (
          <li className={`agent-parse-step is-${step.state}`} key={step.id}>
            <span className="agent-parse-dot" aria-hidden="true" />
            <div>
              <div className="agent-parse-step-head">
                <strong>{step.title}</strong>
                <span>{statusLabel(step.state)}</span>
              </div>
              <p>{step.detail}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function ReportRunMetrics({
  isLive = false,
  report,
}: {
  isLive?: boolean;
  report: ReadingReport;
}) {
  const metrics = report.agent_run;
  const baseElapsed = metrics?.elapsed_seconds ?? 0;
  const [liveElapsed, setLiveElapsed] = useState(baseElapsed);
  useEffect(() => {
    setLiveElapsed(baseElapsed);
    if (!isLive || !metrics?.elapsed_seconds) {
      return;
    }
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      setLiveElapsed(baseElapsed + (Date.now() - startedAt) / 1000);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [baseElapsed, isLive, metrics?.elapsed_seconds]);
  if (
    !metrics?.elapsed_seconds &&
    !metrics?.total_tokens &&
    !metrics?.coverage_percent &&
    !metrics?.chunks_processed
  ) {
    return null;
  }
  const bits = [];
  if (metrics.coverage_percent != null) {
    bits.push(`覆盖全文 ${Math.round(metrics.coverage_percent * 100)}%`);
  }
  if (metrics.chunks_processed && metrics.chunks_processed > 1) {
    bits.push(`${metrics.chunks_processed} chunks`);
  }
  if (metrics.total_tokens) {
    bits.push(`${formatTokenCount(metrics.total_tokens)} tokens`);
  }
  if (metrics.elapsed_seconds) {
    bits.push(`${formatDuration(liveElapsed)}`);
  }
  if (bits.length === 0) {
    return null;
  }
  return <p className="report-run-metrics">解析指标 · {bits.join(" · ")}</p>;
}

function formatTokenCount(tokens: number) {
  if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(tokens >= 10000 ? 0 : 1)}k`;
  }
  return String(tokens);
}

function formatDuration(seconds: number) {
  if (seconds >= 60) {
    const minutes = Math.floor(seconds / 60);
    const rest = Math.round(seconds % 60);
    return `${minutes}m ${rest}s`;
  }
  return `${seconds.toFixed(seconds >= 10 ? 0 : 1)}s`;
}

function AgentConfigPanel({
  config,
  draft,
  locale,
  message,
  onChange,
  onSave,
}: {
  config: AgentConfig | null;
  draft: AgentConfigUpdate;
  locale: Locale;
  message: string | null;
  onChange: (draft: AgentConfigUpdate) => void;
  onSave: () => void;
}) {
  const text = UI_TEXT[locale];
  if (!config) {
    return null;
  }
  const modelOptions = Array.isArray(config.model_options) ? config.model_options : [];
  const modelValue = String(draft.model ?? config.model ?? "");
  const apiKeyValue = String(draft.api_key ?? "");
  const timeoutValue = String(draft.report_read_timeout ?? config.report_read_timeout ?? 180);
  const modelChoices = Array.from(new Set([modelValue, ...modelOptions].filter(Boolean)));
  const timeoutChoices = [45, 90, 120, 180];
  const messageKind =
    message && message === text.agentConfigSaved ? "success" : message ? "failed" : null;
  return (
    <details className="agent-config-panel">
      <summary className="agent-config-summary">
        <span>
          <span className="label-section">{text.agentConfig}</span>
          <span className="agent-config-current">
            {config.has_api_key ? text.agentApiKeyConfigured : text.agentApiKeyMissing} ·{" "}
            {modelValue || config.mode} · {timeoutValue}s
          </span>
        </span>
        <span className={`agent-chip ${config.configured ? "ready" : "missing"}`}>
          {config.mode}
        </span>
      </summary>
      <div className="agent-config-stack">
        <p className="agent-config-hint">{text.agentConfigHint}</p>
        <label className="agent-config-field">
          <span className="agent-config-label">{text.agentApiKey}</span>
          <input
            className="agent-config-input"
            aria-label={text.agentApiKey}
            autoComplete="off"
            placeholder={text.agentApiKeyPlaceholder}
            type="password"
            value={apiKeyValue}
            onChange={(event) => onChange({ ...draft, api_key: event.target.value })}
          />
          <span className={`agent-key-state ${config.has_api_key ? "ready" : "missing"}`}>
            {config.has_api_key ? text.agentApiKeyConfigured : text.agentApiKeyMissing}
          </span>
        </label>
        <div className="agent-config-field">
          <span className="agent-config-label">{text.agentModel}</span>
          <div className="agent-model-options" role="group" aria-label={text.agentModel}>
            {modelChoices.map((model) => (
              <button
                type="button"
                className={`agent-option ${model === modelValue ? "selected" : ""}`}
                aria-pressed={model === modelValue}
                key={model}
                onClick={() => onChange({ ...draft, model })}
              >
                <span>{modelName(model)}</span>
                <small>{model}</small>
              </button>
            ))}
          </div>
        </div>
        <div className="agent-config-field">
          <span className="agent-config-label">{text.agentTimeout}</span>
          <div className="agent-timeout-row">
            <div className="agent-timeout-presets">
              {timeoutChoices.map((seconds) => (
                <button
                  type="button"
                  className={`agent-timeout-pill ${Number(timeoutValue) === seconds ? "selected" : ""}`}
                  aria-pressed={Number(timeoutValue) === seconds}
                  key={seconds}
                  onClick={() => onChange({ ...draft, report_read_timeout: seconds })}
                >
                  {seconds}s
                </button>
              ))}
            </div>
            <label className="agent-timeout-custom">
              <input
                aria-label={text.agentTimeout}
                min={10}
                max={600}
                type="number"
                value={timeoutValue}
                onChange={(event) =>
                  onChange({ ...draft, report_read_timeout: Number(event.target.value) })
                }
              />
              <span>s</span>
            </label>
          </div>
        </div>
        <div className="agent-config-actions">
          <button type="button" className="btn-ghost" onClick={onSave}>
            {text.saveAgentConfig}
          </button>
          {message ? (
            <span className={`agent-config-message is-${messageKind}`} role="status">
              {message}
            </span>
          ) : null}
        </div>
      </div>
    </details>
  );
}

function modelName(model: string) {
  if (model.includes("flash")) {
    return "Flash";
  }
  if (model.includes("pro")) {
    return "Pro";
  }
  if (model.includes("reasoner")) {
    return "Reasoner";
  }
  if (model.includes("chat")) {
    return "Chat";
  }
  return "Custom";
}

function PaperProcessingLine({
  paper,
  locale,
}: {
  paper: Paper;
  locale: Locale;
}) {
  if (!paper.status || paper.status.stage === "completed") {
    return null;
  }
  const text = UI_TEXT[locale];
  const statusLabels = text.statusLabels as Record<string, string>;
  const stage = paper.status.stage ?? "unknown";
  const stageLabel = statusLabels[stage] ?? statusLabels.unknown;
  const isActive = stage === "queued" || stage === "processing";
  const message =
    stage === "failed"
      ? locale === "zh"
        ? "上次 Agentify 失败，可重新获取信息。"
        : "Last Agentify run failed. Re-agentify to refresh the information."
      : localizeTaskMessage(paper.status.message, locale);
  return (
    <div className="paper-processing-line">
      <span>{message}</span>
      <span className="paper-processing-stage">{stageLabel}</span>
      {isActive ? (
        <span className="paper-progress-track is-active" aria-hidden="true">
          <span />
        </span>
      ) : null}
    </div>
  );
}

function ClaimItem({
  claim,
  locale,
  ord,
  onSelect,
  selected = false,
}: {
  claim: Claim;
  locale: Locale;
  ord: number;
  onSelect?: (claim: Claim) => void;
  selected?: boolean;
}) {
  const text = UI_TEXT[locale];
  return (
    <li className={`claim-item ${selected ? "selected" : ""}`}>
      <span className="claim-ord">{String(ord).padStart(2, "0")}</span>
      <div className="claim-body">
        <p className="claim-text">
          <span className={`badge ${claim.reliability.toLowerCase()}`}>
            {claim.reliability}
          </span>{" "}
          {claim.text}
        </p>
        {claim.uncertainty ? (
          <p className="claim-uncertainty">{claim.uncertainty}</p>
        ) : null}
      </div>
      <div className="claim-actions">
        <button
          type="button"
          className="btn-link"
          onClick={() => onSelect?.(claim)}
        >
          {text.evidenceButton(claim.evidence.length)}
        </button>
      </div>
    </li>
  );
}

function RelatedItem({
  item,
  locale,
  ord,
}: {
  item: RelatedWorkItem;
  locale: Locale;
  ord: number;
}) {
  const text = UI_TEXT[locale];
  return (
    <li className="related-item">
      <span className="paper-ord">{String(ord).padStart(2, "0")}</span>
      <div className="related-body">
        <h4 className="related-title">
          <span className={`badge ${item.reliability.toLowerCase()}`}>
            {item.reliability}
          </span>
          {item.title}
        </h4>
        <RelatedMetaLine item={item} locale={locale} />
        <p className="related-relation">{item.relation}</p>
        {item.evidence?.[0]?.quote ? (
          <p className="related-tldr">{item.evidence[0].quote}</p>
        ) : null}
        <p className="related-source">{item.source}</p>
        {item.comparison_risk ? (
          <p className="warning small">
            {text.r1ComparisonRisk}
            {item.comparison_risk}
          </p>
        ) : null}
      </div>
    </li>
  );
}

function Rail({
  agentConfig,
  agentConfigDraft,
  agentConfigMessage,
  chat,
  chatStatus,
  locale,
  notePath,
  onAgentConfigChange,
  onAgentConfigSave,
  onAsk,
  onExport,
  onEvidenceOpen,
  onRerun,
  onResizeStart,
  paper,
  selectedClaim,
}: {
  agentConfig: AgentConfig | null;
  agentConfigDraft: AgentConfigUpdate;
  agentConfigMessage: string | null;
  chat: PaperChatResponse | null;
  chatStatus: ChatPanelStatus;
  locale: Locale;
  notePath: string | null;
  onAgentConfigChange: (draft: AgentConfigUpdate) => void;
  onAgentConfigSave: () => void;
  onAsk: (question: string) => Promise<void>;
  onExport: () => Promise<void>;
  onEvidenceOpen: (evidence: Evidence) => void;
  onRerun: () => void;
  onResizeStart: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  paper: Paper;
  selectedClaim: Claim | null;
}) {
  const text = UI_TEXT[locale];
  const [question, setQuestion] = useState("");
  return (
    <aside className="workspace-rail">
      <button
        type="button"
        className="rail-resize-handle"
        aria-label="Resize Agent rail"
        onPointerDown={onResizeStart}
      />
      <section className="rail-block">
        <div className="rail-block-head">
          <p className="label-section">{text.agentStatus}</p>
          <StatusBadge locale={locale} status={paper.status} />
        </div>
        <p className="rail-message">
          {paper.status?.message
            ? localizeTaskMessage(paper.status.message, locale)
            : text.noActiveTask}
        </p>
        <button type="button" className="btn-link" onClick={onRerun}>
          {text.rerunAgent}
        </button>
      </section>

      <AgentConfigPanel
        config={agentConfig}
        draft={agentConfigDraft}
        locale={locale}
        message={agentConfigMessage}
        onChange={onAgentConfigChange}
        onSave={onAgentConfigSave}
      />

      <section className="rail-block">
        <div className="rail-block-head">
          <p className="label-section">{text.evidenceDetail}</p>
        </div>
        {selectedClaim ? (
          <>
            <p className="rail-evidence-claim">{selectedClaim.text}</p>
            {selectedClaim.evidence.length > 0 ? (
              <div className="rail-evidence">
                {selectedClaim.evidence.map((evidence) => (
                  <div className="evidence-block" key={evidence.id}>
                    <p className="evidence-quote">{evidence.quote}</p>
                    <p className="evidence-meta">
                      <span>{evidence.source}</span>
                      {evidence.page ? (
                        <span>{text.page(evidence.page)}</span>
                      ) : null}
                      {evidence.section ? <span>{evidence.section}</span> : null}
                      <LocationGlyph evidence={evidence} locale={locale} />
                    </p>
                    {evidence.page ? (
                      <button
                        type="button"
                        className="btn-link evidence-open"
                        onClick={() => onEvidenceOpen(evidence)}
                      >
                        {locale === "zh" ? "在 PDF 中查看" : "Open in PDF"}
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="rail-message warning">{text.missingEvidence}</p>
            )}
          </>
        ) : (
          <p className="rail-message muted-soft">{text.selectClaim}</p>
        )}
      </section>

      <section className="rail-block agent-chat" id="agent-chat">
        <div className="agent-chat-head">
          <p className="label-section">{text.agentChat}</p>
          <div className="agent-chat-head-actions">
            <a className="btn-link" href="#agent-composer">
              {text.jumpToChatInput}
            </a>
            <span className={`agent-chat-status is-${chatStatus}`}>
              {chatStatus === "running"
                ? text.chatRunning
                : chatStatus === "completed"
                  ? text.chatCompleted
                  : chatStatus === "failed"
                    ? text.chatFailed
                    : text.chatIdle}
            </span>
          </div>
        </div>
        {chat ? (
          <>
            <div className="agent-process" aria-label={text.processCards}>
              {chat.steps.map((step) => (
                <div className={`agent-process-card is-${step.status}`} key={step.id}>
                  <span className="agent-process-dot" aria-hidden="true" />
                  <div>
                    <p>{step.label}</p>
                    {step.detail ? <span>{step.detail}</span> : null}
                  </div>
                </div>
              ))}
            </div>
            {chat.used_context?.includes("web_search") ? (
              <p className="agent-web-context-note">{text.webSearchNotice}</p>
            ) : null}
            <div className="agent-transcript">
              {chat.messages.map((message) => (
                <article className={`agent-message is-${message.role}`} key={message.id}>
                  <p className="agent-message-role">
                    {message.role === "user" ? "You" : "Agent"}
                    {message.reliability ? (
                      <span className={`badge ${message.reliability.toLowerCase()}`}>
                        {message.reliability}
                      </span>
                    ) : null}
                  </p>
                  <p>{message.content}</p>
                  {message.evidence && message.evidence.length > 0 ? (
                    <p className="agent-message-evidence">
                      {message.evidence[0].quote}
                      {isExternalSource(message.evidence[0].source) ? (
                        <span>{message.evidence[0].source}</span>
                      ) : null}
                    </p>
                  ) : null}
                </article>
              ))}
            </div>
          </>
        ) : (
          <p className="rail-message muted-soft">{text.chatIdle}</p>
        )}
        <div className="agent-composer" id="agent-composer">
          <input
            placeholder={text.askPlaceholder}
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                const q = question; setQuestion(""); void onAsk(q);
              }
            }}
          />
          <button
            type="button"
            className="btn-link"
            disabled={!question.trim() || chatStatus === "running"}
            onClick={() => { const q = question; setQuestion(""); void onAsk(q); }}
          >
            {text.ask}
          </button>
        </div>
      </section>

      <section className="rail-block">
        <div className="rail-block-head">
          <p className="label-section">{text.obsidian}</p>
        </div>
        <button
          type="button"
          className="btn-link"
          onClick={() => void onExport()}
        >
          {text.saveNote}
        </button>
        {notePath ? (
          <p className="rail-saved">{text.savedTo(notePath)}</p>
        ) : (
          <p className="rail-message muted-soft">{text.noNote}</p>
        )}
      </section>
    </aside>
  );
}

function StatusBadge({
  status,
  locale,
}: {
  status?: TaskStatus;
  locale: Locale;
}) {
  const stage = status?.stage ?? "unknown";
  const text = UI_TEXT[locale];
  const label =
    text.statusLabels[stage as keyof typeof text.statusLabels] ?? stage;
  return <span className={`status-badge ${stage}`}>{label}</span>;
}

function LocationGlyph({
  evidence,
  locale,
}: {
  evidence: Evidence;
  locale: Locale;
}) {
  const text = UI_TEXT[locale];
  const status =
    evidence.location_status ?? (evidence.page ? "page_and_quote" : "quote_only");
  const labels: Record<string, string> = {
    exact: text.locationExact,
    page_and_quote: text.locationPageQuote,
    quote_only: text.locationQuoteOnly,
    missing: text.locationMissing,
  };
  return (
    <span className={`location-glyph location-${status}`}>
      {labels[status] ?? status}
    </span>
  );
}

function RelatedMetaLine({
  item,
  locale,
}: {
  item: RelatedWorkItem;
  locale: Locale;
}) {
  const text = UI_TEXT[locale];
  const parts: { key: string; node: React.ReactNode }[] = [];
  const authors = item.authors ?? [];
  if (authors.length > 0) {
    const head = authors.slice(0, 3).join(", ");
    parts.push({
      key: "authors",
      node: <span>{authors.length > 3 ? `${head}, et al.` : head}</span>,
    });
  }
  if (item.year) {
    parts.push({ key: "year", node: <span className="mono">{item.year}</span> });
  }
  if (item.venue) {
    parts.push({ key: "venue", node: <span>{item.venue}</span> });
  }
  if (item.citation_count != null) {
    parts.push({
      key: "cites",
      node: <span className="mono">{text.r1CitedBy(item.citation_count)}</span>,
    });
  }
  if (item.influential_citation_count != null) {
    parts.push({
      key: "influence",
      node: (
        <span className="mono">
          {text.r1InfluentialCitedBy(item.influential_citation_count)}
        </span>
      ),
    });
  }
  if (item.arxiv_id) {
    parts.push({
      key: "arxiv",
      node: <span className="mono">arXiv:{item.arxiv_id}</span>,
    });
  }
  if (item.doi) {
    parts.push({
      key: "doi",
      node: <span className="mono">DOI:{item.doi}</span>,
    });
  }
  if (parts.length === 0) {
    return null;
  }
  return (
    <p className="meta-line">
      {parts.map((part) => (
        <span key={part.key}>{part.node}</span>
      ))}
    </p>
  );
}

function PaperMetadataLine({ paper }: { paper: Paper }) {
  const metadata = paper.metadata ?? null;
  if (!metadata) {
    return null;
  }
  const parts: { key: string; node: React.ReactNode }[] = [];
  const authors = metadata.authors ?? [];
  if (authors.length > 0) {
    const head = authors.slice(0, 3).join(", ");
    parts.push({
      key: "authors",
      node: <span>{authors.length > 3 ? `${head}, et al.` : head}</span>,
    });
  }
  if (metadata.year) {
    parts.push({
      key: "year",
      node: <span className="mono">{metadata.year}</span>,
    });
  }
  if (metadata.venue) {
    parts.push({ key: "venue", node: <span>{metadata.venue}</span> });
  }
  if (metadata.arxiv_id) {
    parts.push({
      key: "arxiv",
      node: <span className="mono">arXiv:{metadata.arxiv_id}</span>,
    });
  }
  if (metadata.doi) {
    parts.push({
      key: "doi",
      node: <span className="mono">DOI:{metadata.doi}</span>,
    });
  }
  if (metadata.source_type && metadata.source_type !== "local_pdf") {
    parts.push({
      key: "source",
      node: <span className="mono">{metadata.source_type}</span>,
    });
  }
  if (parts.length === 0) {
    return null;
  }
  return (
    <p className="meta-line">
      {parts.map((part) => (
        <span key={part.key}>{part.node}</span>
      ))}
    </p>
  );
}

/* ============================================================================
   Field Map
   ============================================================================ */

function FieldMapSection({
  fieldMap,
  running,
  error,
  locale,
  onGenerate,
}: {
  fieldMap: FieldMap | null;
  running: boolean;
  error: string | null;
  locale: Locale;
  onGenerate: () => void;
}) {
  const text = UI_TEXT[locale];
  return (
    <section className="report-section field-map-section" id="field-map">
      <div className="section-head">
        <h3>{text.fieldMapTitle}</h3>
        <div className="section-head-actions">
          <button
            type="button"
            className="btn-ghost"
            onClick={onGenerate}
            disabled={running}
          >
            {running
              ? text.fieldMapRunning
              : fieldMap
                ? text.fieldMapRegenerate
                : text.fieldMapGenerate}
          </button>
        </div>
      </div>
      {error ? (
        <p className="warning-line">
          {text.fieldMapFailed}
          {error}
        </p>
      ) : null}
      {!fieldMap ? <p className="field-map-empty">{text.fieldMapEmpty}</p> : null}
      {fieldMap ? <FieldMapBody fieldMap={fieldMap} locale={locale} /> : null}
    </section>
  );
}

function FieldMapBody({
  fieldMap,
  locale,
}: {
  fieldMap: FieldMap;
  locale: Locale;
}) {
  const text = UI_TEXT[locale];
  return (
    <>
      <div className="field-map-body">
        {fieldMap.field_summary ? (
          <article className="field-map-summary">
            <h4>{text.fieldMapSummary}</h4>
            <p>{fieldMap.field_summary}</p>
          </article>
        ) : (
          <article className="field-map-summary">
            <h4>{text.fieldMapSummary}</h4>
            <p className="muted-soft">{text.fieldMapEmpty}</p>
          </article>
        )}

        <div className="field-map-taxa">
          <FieldMapTaxon
            label={text.fieldMapTaskTaxonomy}
            items={fieldMap.task_taxonomy}
          />
          <FieldMapTaxon
            label={text.fieldMapDatasets}
            items={fieldMap.datasets_benchmarks}
          />
          <FieldMapTaxon label={text.fieldMapMetrics} items={fieldMap.metrics} />
          <FieldMapTaxon
            label={text.fieldMapMethodFamilies}
            items={fieldMap.method_families}
          />
        </div>
      </div>

      {fieldMap.relationship_graph?.nodes.length ? (
        <RelationshipGraph graph={fieldMap.relationship_graph} locale={locale} />
      ) : null}

      {fieldMap.milestones.length > 0 ? (
        <article className="field-map-milestones">
          <h4>{text.fieldMapMilestones}</h4>
          <ol className="milestone-list">
            {fieldMap.milestones.map((ms, idx) => (
              <MilestoneItem
                key={ms.id}
                milestone={ms}
                ord={idx + 1}
                locale={locale}
              />
            ))}
          </ol>
        </article>
      ) : null}

      {fieldMap.timeline.length > 0 ? (
        <article className="field-map-timeline-wrap">
          <h4>{text.fieldMapTimeline}</h4>
          <ol className="timeline-list">
            {fieldMap.timeline.map((event) => (
              <TimelineItem key={event.id} event={event} />
            ))}
          </ol>
        </article>
      ) : null}

      {fieldMap.open_problems.length > 0 ? (
        <PullList
          title={text.fieldMapOpenProblems}
          claims={fieldMap.open_problems}
        />
      ) : null}
      {fieldMap.recent_trends.length > 0 ? (
        <PullList
          title={text.fieldMapRecentTrends}
          claims={fieldMap.recent_trends}
        />
      ) : null}
      {fieldMap.research_opportunities.length > 0 ? (
        <PullList
          title={text.fieldMapOpportunities}
          claims={fieldMap.research_opportunities}
        />
      ) : null}
    </>
  );
}

function RelationshipGraph({
  graph,
  locale,
}: {
  graph: FieldMapRelationshipGraph;
  locale: Locale;
}) {
  const text = UI_TEXT[locale];
  const nodes = graph.nodes.slice(0, 12);
  const columns = {
    predecessor: nodes.filter((node) => node.role === "predecessor"),
    seed: nodes.filter((node) => node.role === "seed"),
    successor: nodes.filter((node) => node.role !== "predecessor" && node.role !== "seed"),
  };
  const columnDefs = [
    { key: "predecessor", label: text.fieldMapGraphPredecessor, x: 92, nodes: columns.predecessor },
    { key: "seed", label: text.fieldMapGraphSeed, x: 360, nodes: columns.seed },
    { key: "successor", label: text.fieldMapGraphSuccessor, x: 628, nodes: columns.successor },
  ];
  const positions = new Map<string, { x: number; y: number }>();
  columnDefs.forEach((column) => {
    const count = Math.max(1, column.nodes.length);
    column.nodes.forEach((node, idx) => {
      const y = 78 + ((idx + 1) * 220) / (count + 1);
      positions.set(node.id, { x: column.x, y });
    });
  });

  return (
    <article className="relationship-graph-wrap">
      <h4>{text.fieldMapRelationshipGraph}</h4>
      <div className="relationship-graph" aria-label={text.fieldMapRelationshipGraph}>
        <svg viewBox="0 0 720 340">
          <defs>
            <marker
              id="graph-arrow"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" />
            </marker>
          </defs>
          {columnDefs.map((column) => (
            <text key={column.key} className="relationship-column-label" x={column.x} y="28">
              {column.label}
            </text>
          ))}
          {graph.edges.map((edge) => {
            const source = positions.get(edge.source);
            const target = positions.get(edge.target);
            if (!source || !target) return null;
            const mid = (source.x + target.x) / 2;
            return (
              <path
                key={edge.id}
                className="relationship-edge"
                d={`M ${source.x + 44} ${source.y} C ${mid} ${source.y}, ${mid} ${target.y}, ${target.x - 44} ${target.y}`}
                markerEnd="url(#graph-arrow)"
              />
            );
          })}
          {nodes.map((node) => {
            const pos = positions.get(node.id);
            if (!pos) return null;
            const reliability = node.reliability ?? "R1";
            const roleLabel = relationshipRoleLabel(node.role, locale);
            const tooltipX = pos.x < 360 ? pos.x + 46 : pos.x - 266;
            const tooltipY = Math.max(42, pos.y - 54);
            const tooltipLabel = `${node.title} · ${roleLabel}${
              node.year ? ` · ${node.year}` : ""
            } · ${reliability}`;
            return (
              <g
                key={node.id}
                aria-label={tooltipLabel}
                className={`relationship-node relationship-node-${node.role}`}
                role="img"
                tabIndex={0}
              >
                <title>{tooltipLabel}</title>
                <circle cx={pos.x} cy={pos.y} r="34" />
                <text className="relationship-node-year" x={pos.x} y={pos.y - 6}>
                  {node.year ?? "seed"}
                </text>
                <text className="relationship-node-kind" x={pos.x} y={pos.y + 12}>
                  {node.event_type.replace("_", " ")}
                </text>
                <foreignObject
                  className="relationship-tooltip"
                  height="96"
                  width="220"
                  x={tooltipX}
                  y={tooltipY}
                >
                  <div className="relationship-tooltip-card">
                    <p className="relationship-tooltip-title">{node.title}</p>
                    <p className="relationship-tooltip-meta">
                      <span>{roleLabel}</span>
                      {node.year ? <span>{node.year}</span> : null}
                      <span>{reliability}</span>
                    </p>
                  </div>
                </foreignObject>
              </g>
            );
          })}
        </svg>
        <ol className="relationship-node-list">
          {nodes.map((node) => (
            <RelationshipNodeRow key={node.id} node={node} />
          ))}
        </ol>
        <ol className="relationship-edge-list">
          {graph.edges.slice(0, 8).map((edge) => (
            <li key={edge.id}>
              <span className={`badge ${edge.source_type === "agent_suggested" ? "r1" : "r2"}`}>
                {edge.source_type === "agent_suggested"
                  ? text.fieldMapAgentSuggested
                  : text.fieldMapRuleSuggested}
              </span>
              <span>{edge.relation}</span>
              {edge.confidence != null ? (
                <span className="mono">{Math.round(edge.confidence * 100)}%</span>
              ) : null}
              {edge.rationale ? <p>{edge.rationale}</p> : null}
            </li>
          ))}
        </ol>
      </div>
    </article>
  );
}

function relationshipRoleLabel(role: string, locale: Locale) {
  const text = UI_TEXT[locale];
  if (role === "predecessor") return text.fieldMapGraphPredecessor;
  if (role === "seed") return text.fieldMapGraphSeed;
  return text.fieldMapGraphSuccessor;
}

function RelationshipNodeRow({
  node,
}: {
  node: FieldMapRelationshipGraph["nodes"][number];
}) {
  const reliability = node.reliability ?? "R1";
  return (
    <li className={`relationship-node-row is-${node.role}`}>
      <span className={`badge ${reliability.toLowerCase()}`}>{reliability}</span>
      <span className="relationship-node-title">{node.title}</span>
      {node.year ? <span className="mono">{node.year}</span> : null}
    </li>
  );
}

function FieldMapTaxon({ label, items }: { label: string; items: string[] }) {
  if (!items || items.length === 0) {
    return null;
  }
  return (
    <article>
      <h4>{label}</h4>
      <p className="field-map-tag-text">
        {items.map((item, idx) => (
          <span key={`${item}-${idx}`}>{item}</span>
        ))}
      </p>
    </article>
  );
}

function MilestoneItem({
  milestone,
  ord,
  locale,
}: {
  milestone: MilestonePaper;
  ord: number;
  locale: Locale;
}) {
  const text = UI_TEXT[locale];
  return (
    <li className="milestone-item">
      <span className="milestone-ord">{String(ord).padStart(2, "0")}</span>
      <div>
        <p className="milestone-title">{milestone.title}</p>
        <p className="milestone-meta">
          {milestone.authors.length > 0 ? (
            <span>
              {milestone.authors.slice(0, 3).join(", ")}
              {milestone.authors.length > 3 ? ", et al." : ""}
            </span>
          ) : null}
          {milestone.year ? (
            <span className="mono">{milestone.year}</span>
          ) : null}
          {milestone.venue ? <span>{milestone.venue}</span> : null}
          {milestone.velocity ? (
            <span className="mono">{milestone.velocity}/yr</span>
          ) : null}
        </p>
        <p className="milestone-category">{milestone.category}</p>
        <p className="milestone-why">{milestone.why_milestone}</p>
        {milestone.risk ? (
          <p className="milestone-risk">
            {text.fieldMapRisk}
            {milestone.risk}
          </p>
        ) : null}
      </div>
      <span className="milestone-score">
        {milestone.milestone_score.toFixed(2)}
      </span>
    </li>
  );
}

function TimelineItem({ event }: { event: TimelineEvent }) {
  return (
    <li className="timeline-item">
      <span className="timeline-year">{event.year ?? "—"}</span>
      <div className="timeline-body">
        <span className={`timeline-type is-${event.event_type}`}>
          {event.event_type.replace("_", " ")}
        </span>
        <p className="timeline-title">
          {event.title}
          {event.venue ? <span className="meta"> · {event.venue}</span> : null}
        </p>
        {event.key_idea ? <p className="timeline-key">{event.key_idea}</p> : null}
      </div>
    </li>
  );
}

function PullList({ title, claims }: { title: string; claims: Claim[] }) {
  return (
    <article className="field-map-pull">
      <h4>{title}</h4>
      <ul className="pull-list">
        {claims.map((claim) => (
          <li className="pull-item" key={claim.id}>
            <span className={`badge ${claim.reliability.toLowerCase()}`}>
              {claim.reliability}
            </span>
            <div className="pull-item-body">
              <p className="pull-item-text">{claim.text}</p>
              {claim.uncertainty ? (
                <p className="pull-item-meta">{claim.uncertainty}</p>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </article>
  );
}

/* ============================================================================
   Helpers
   ============================================================================ */

function readInitialLocale(): Locale {
  if (typeof window === "undefined") {
    return "zh";
  }
  if (typeof window.localStorage?.getItem !== "function") {
    return "zh";
  }
  return window.localStorage.getItem("paperflow-locale") === "en" ? "en" : "zh";
}

function isPaperAgentActive(paper: Paper) {
  return ["queued", "processing"].includes(paper.status?.stage ?? "");
}

function localizeTaskMessage(message: string, locale: Locale) {
  const text = UI_TEXT[locale];
  const taskMessages = text.taskMessages as Record<string, string>;
  if (locale === "zh" && message.startsWith("Agent not configured")) {
    return "Agent 未配置。请设置 DEEPSEEK_API_KEY 或 ~/.deepseek/config.toml。";
  }
  const partialProgress = parsePartialReportProgressMessage(message);
  if (partialProgress) {
    return locale === "zh"
      ? `首批关键信息已生成：覆盖全文 ${partialProgress.coverage}，${partialProgress.chunks} 个 chunk；报告仍在动态补全。`
      : `First key findings are available: ${partialProgress.coverage} coverage, ${partialProgress.chunks} chunk(s); the report is still updating.`;
  }
  const pdfProgress = parsePdfProgressMessage(message);
  if (pdfProgress) {
    return locale === "zh"
      ? `PDF 文本已抽取：${formatExtractedTextSize(pdfProgress.input, locale)}。`
      : `PDF text extracted: ${formatExtractedTextSize(pdfProgress.input, locale)}.`;
  }
  const briefingProgress = parseDeepSeekBriefingMessage(message);
  if (briefingProgress) {
    return locale === "zh"
      ? `DeepSeek 正在快速扫读论文：模型 ${briefingProgress.model}，${formatExtractedTextSize(briefingProgress.input, locale)}。`
      : `DeepSeek is building a fast paper briefing: model ${briefingProgress.model}, ${formatExtractedTextSize(briefingProgress.input, locale)}.`;
  }
  const chunkRunProgress = parseDeepSeekChunkRunMessage(message);
  if (chunkRunProgress) {
    return locale === "zh"
      ? `DeepSeek 正在并行抽取 ${chunkRunProgress.chunks} 个 chunk：模型 ${chunkRunProgress.model}，${formatExtractedTextSize(chunkRunProgress.input, locale)}。`
      : `DeepSeek is extracting ${chunkRunProgress.chunks} chunks in parallel: model ${chunkRunProgress.model}, ${formatExtractedTextSize(chunkRunProgress.input, locale)}.`;
  }
  const chunkDoneProgress = parseDeepSeekChunkDoneMessage(message);
  if (chunkDoneProgress) {
    return locale === "zh"
      ? `DeepSeek chunk 抽取进度：${chunkDoneProgress.done}/${chunkDoneProgress.total}。`
      : `DeepSeek chunk extraction progress: ${chunkDoneProgress.done}/${chunkDoneProgress.total}.`;
  }
  const synthesisProgress = parseDeepSeekSynthesisMessage(message);
  if (synthesisProgress) {
    return locale === "zh"
      ? `DeepSeek 正在由 coordinator 合并去重：${synthesisProgress.chunks} 个 chunk reports。`
      : `DeepSeek coordinator is merging and deduplicating ${synthesisProgress.chunks} chunk reports.`;
  }
  const deepSeekProgress = parseDeepSeekProgressMessage(message);
  if (deepSeekProgress) {
    const coverage = formatDeepSeekInputCoverage(deepSeekProgress.input, locale);
    if (locale === "zh") {
      return `DeepSeek 正在生成阅读报告：模型 ${deepSeekProgress.model}，${coverage}。`;
    }
    return `DeepSeek is generating the reading report: model ${deepSeekProgress.model}, ${coverage}.`;
  }
  return taskMessages[message] ?? message;
}

function isDeepSeekProgressMessage(message: string) {
  return (
    parseDeepSeekProgressMessage(message) !== null ||
    parseDeepSeekBriefingMessage(message) !== null ||
    parseDeepSeekChunkRunMessage(message) !== null ||
    parseDeepSeekChunkDoneMessage(message) !== null ||
    parseDeepSeekSynthesisMessage(message) !== null
  );
}

function parseDeepSeekProgressMessage(message: string) {
  const match = message.match(
    /^DeepSeek (?:report generation is running|request prepared) \(model=([^,]+), timeout=([^,]+), input=([^)]+)\)$/,
  );
  if (!match) {
    return null;
  }
  return {
    model: match[1],
    timeout: match[2],
    input: match[3],
  };
}

function parsePdfProgressMessage(message: string) {
  const match = message.match(/^PDF text extraction completed \(input=([^)]+)\)$/);
  if (!match) {
    return null;
  }
  return { input: match[1] };
}

function parsePartialReportProgressMessage(message: string) {
  const match = message.match(
    /^Partial reading report available \(coverage=([^,]+), chunks=(\d+)\)$/,
  );
  if (!match) {
    return null;
  }
  return {
    coverage: match[1],
    chunks: match[2],
  };
}

function parseDeepSeekBriefingMessage(message: string) {
  const match = message.match(/^DeepSeek briefing is running \(model=([^,]+), input=([^)]+)\)$/);
  if (!match) {
    return null;
  }
  return { model: match[1], input: match[2] };
}

function parseDeepSeekChunkRunMessage(message: string) {
  const match = message.match(
    /^DeepSeek parallel chunk extraction is running \(model=([^,]+), chunks=(\d+), input=([^)]+)\)$/,
  );
  if (!match) {
    return null;
  }
  return { model: match[1], chunks: match[2], input: match[3] };
}

function parseDeepSeekChunkDoneMessage(message: string) {
  const match = message.match(/^DeepSeek chunk completed \(chunk=(\d+)\/(\d+)\)$/);
  if (!match) {
    return null;
  }
  return { done: match[1], total: match[2] };
}

function parseDeepSeekSynthesisMessage(message: string) {
  const match = message.match(/^DeepSeek coordinator synthesis is running \(model=([^,]+), chunks=(\d+)\)$/);
  if (!match) {
    return null;
  }
  return { model: match[1], chunks: match[2] };
}

function formatExtractedTextSize(input: string, locale: Locale) {
  const value = stripCharUnit(input);
  return locale === "zh" ? `${value} 字符` : `${value} chars`;
}

function formatDeepSeekInputCoverage(input: string, locale: Locale) {
  const value = stripCharUnit(input);
  const [sent, total] = value.split("/");
  if (sent && total) {
    if (sent === total) {
      if (locale === "zh") {
        return `将处理 PDF 文本 ${total} 字符`;
      }
      return `will process ${total} chars from the PDF`;
    }
    if (locale === "zh") {
      return `已准备 ${sent} 字符 / PDF 全文 ${total} 字符`;
    }
    return `prepared ${sent} chars / full PDF ${total} chars`;
  }
  if (locale === "zh") {
    return `已准备 ${value} 字符`;
  }
  return `prepared ${value} chars`;
}

function stripCharUnit(input: string) {
  return input.replace(/\s*chars$/i, "").trim();
}

function localizeSectionTitle(title: string, locale: Locale) {
  const sectionTitles = UI_TEXT[locale].sectionTitles as Record<string, string>;
  return sectionTitles[title] ?? title;
}

function buildLibraryStatus(papers: Paper[], status: string, locale: Locale) {
  const active = papers.filter((paper) =>
    ["queued", "processing"].includes(paper.status?.stage ?? ""),
  ).length;
  const failed = papers.filter((paper) => paper.status?.stage === "failed").length;
  const completed = papers.filter((paper) => paper.status?.stage === "completed").length;
  const idleStatus = status === UI_TEXT.en.readyStatus || status === "Reading report generated";

  if (!idleStatus && active === 0) {
    return localizeTaskMessage(status, locale);
  }

  if (locale === "zh") {
    if (papers.length === 0) {
      return "文献库为空，等待导入第一篇论文。";
    }
    const failedPart = failed > 0 ? `，${failed} 篇失败` : "";
    const activePart = active > 0 ? `，${active} 篇处理中` : "，当前没有后台任务";
    return `${papers.length} 篇论文，${completed} 篇报告已完成${activePart}${failedPart}。`;
  }

  if (papers.length === 0) {
    return "Library is empty, waiting for the first paper.";
  }
  const failedPart = failed > 0 ? `, ${failed} failed` : "";
  const activePart = active > 0 ? `, ${active} in progress` : ", no background tasks";
  return `${papers.length} paper${papers.length === 1 ? "" : "s"}, ${completed} report${
    completed === 1 ? "" : "s"
  } completed${activePart}${failedPart}.`;
}

function importActivityMessage(activity: ImportActivity, locale: Locale) {
  const title = activity.title?.trim();
  if (activity.message) {
    return activity.message;
  }
  if (locale === "zh") {
    switch (activity.stage) {
      case "uploading":
        return "正在上传 PDF。上传成功后会自动加入 Agent 解析队列。";
      case "downloading":
        return `正在下载 ${title || "arXiv PDF"}，下载完成后会开始解析。`;
      case "resolving":
        return `正在解析 ${title || "导入来源"}，稍后会创建论文条目。`;
      case "queued":
        return `已接收 ${title || "论文"}，Agent 正在解析。`;
      case "processing":
        return `${title || "论文"} 正在解析，阅读报告生成后会自动打开。`;
      case "slow":
        return `${title || "论文"} 仍在解析。PDF 较长或模型响应慢时会多等一会，不代表卡住。`;
      case "completed":
        return `${title || "论文"} 阅读报告已生成。`;
      case "failed":
        return `${title || "论文"} 处理失败，请查看错误信息。`;
    }
  }
  switch (activity.stage) {
    case "uploading":
      return "Uploading PDF. It will enter the Agent queue after upload succeeds.";
    case "downloading":
      return `Downloading ${title || "arXiv PDF"}; parsing starts after download.`;
    case "resolving":
      return `Resolving ${title || "import source"} and creating a paper entry.`;
    case "queued":
      return `Received ${title || "paper"}; the Agent is parsing it.`;
    case "processing":
      return `${title || "Paper"} is being parsed. The report opens automatically when ready.`;
    case "slow":
      return `${title || "Paper"} is still parsing. Long PDFs or slow model responses can take longer; this does not mean it is stuck.`;
    case "completed":
      return `${title || "Paper"} reading report is ready.`;
    case "failed":
      return `${title || "Paper"} failed. Check the error details.`;
  }
}

function loadStoredPdfWidth() {
  return loadStoredWidth(PDF_WIDTH_STORAGE_KEY, PDF_WIDTH_DEFAULT, clampPdfWidth);
}

function savePdfWidth(width: number) {
  saveStoredWidth(PDF_WIDTH_STORAGE_KEY, width, clampPdfWidth);
}

function loadStoredReportWidth() {
  return loadStoredWidth(REPORT_WIDTH_STORAGE_KEY, REPORT_WIDTH_DEFAULT, clampReportWidth);
}

function saveReportWidth(width: number) {
  saveStoredWidth(REPORT_WIDTH_STORAGE_KEY, width, clampReportWidth);
}

function loadStoredRailWidth() {
  return loadStoredWidth(RAIL_WIDTH_STORAGE_KEY, RAIL_WIDTH_DEFAULT, clampRailWidth);
}

function saveRailWidth(width: number) {
  saveStoredWidth(RAIL_WIDTH_STORAGE_KEY, width, clampRailWidth);
}

function loadStoredWidth(
  key: string,
  fallback: number,
  clamp: (width: number) => number,
) {
  if (typeof window === "undefined" || typeof window.localStorage?.getItem !== "function") {
    return fallback;
  }
  let stored: string | null = null;
  try {
    stored = window.localStorage.getItem(key);
  } catch {
    return fallback;
  }
  const parsed = stored ? Number.parseInt(stored, 10) : fallback;
  return clamp(Number.isFinite(parsed) ? parsed : fallback);
}

function saveStoredWidth(key: string, width: number, clamp: (width: number) => number) {
  if (typeof window.localStorage?.setItem !== "function") {
    return;
  }
  try {
    window.localStorage.setItem(key, String(clamp(width)));
  } catch {
    // Persisting user layout is nice-to-have; resizing should still work.
  }
}

function clampPdfWidth(width: number) {
  if (typeof window === "undefined") {
    return Math.min(PDF_WIDTH_MAX, Math.max(PDF_WIDTH_MIN, width));
  }
  const viewportBound = Math.floor(window.innerWidth * 0.74);
  const maxWidth = Math.max(PDF_WIDTH_MIN, Math.min(PDF_WIDTH_MAX, viewportBound));
  return Math.min(maxWidth, Math.max(PDF_WIDTH_MIN, width));
}

function clampReportWidth(width: number) {
  if (typeof window === "undefined") {
    return Math.min(REPORT_WIDTH_MAX, Math.max(REPORT_WIDTH_MIN, width));
  }
  const viewportBound = Math.floor(window.innerWidth * 0.5);
  const maxWidth = Math.max(REPORT_WIDTH_MIN, Math.min(REPORT_WIDTH_MAX, viewportBound));
  return Math.min(maxWidth, Math.max(REPORT_WIDTH_MIN, width));
}

function clampRailWidth(width: number) {
  if (typeof window === "undefined") {
    return Math.min(RAIL_WIDTH_MAX, Math.max(RAIL_WIDTH_MIN, width));
  }
  const viewportBound = Math.floor(window.innerWidth * 0.48);
  const maxWidth = Math.max(RAIL_WIDTH_MIN, Math.min(RAIL_WIDTH_MAX, viewportBound));
  return Math.min(maxWidth, Math.max(RAIL_WIDTH_MIN, width));
}

function isExternalSource(source?: string | null) {
  return Boolean(source && /^https?:\/\//i.test(source));
}

function clampResizeDelta(
  delta: number,
  leftStart: number,
  rightStart: number,
  leftMin: number,
  leftMax: number,
  rightMin: number,
  rightMax: number,
) {
  const lower = Math.max(leftMin - leftStart, rightStart - rightMax);
  const upper = Math.min(leftMax - leftStart, rightStart - rightMin);
  return Math.min(upper, Math.max(lower, delta));
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}