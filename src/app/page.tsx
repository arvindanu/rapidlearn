
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";

import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  BookOpen,
  Check,
  Clock3,
  Compass,
  Flame,
  Globe2,
  GraduationCap,
  Home,
  Lightbulb,
  LoaderCircle,
  Mic,
  MicOff,
  Pause,
  Play,
  RotateCcw,
  Search,
  Sparkles,
  Star,
  Volume2,
  X,
  Zap,
} from "lucide-react";

import type { Topic, QuizQuestion } from "@/lib/types";

const categories = [
  "All",
  "Science",
  "Technology",
  "History",
  "Space",
  "Nature",
  "Psychology",
  "Geography",
];

type Page = "home" | "learn" | "speak" | "quiz";

export default function HomePage() {
  const [page, setPage] = useState<Page>("home");

 const [topics, setTopics] = useState<Topic[]>([]);
const [category, setCategory] = useState("All");
const [loading, setLoading] = useState(true);
const [search, setSearch] = useState("");

const [apiPage, setApiPage] = useState(1);
const [hasMoreTopics, setHasMoreTopics] = useState(false);
const [loadingMoreTopics, setLoadingMoreTopics] = useState(false);
const [discoveryPage, setDiscoveryPage] = useState(1);

const TOPICS_PER_PAGE = 12;


// Keep pagination data synchronised between async requests.
const topicsRef = useRef<Topic[]>([]);
const apiPageRef = useRef(1);
const hasMoreTopicsRef = useRef(false);
const loadingMoreTopicsRef = useRef(false);

const categoryRef = useRef("All");
const apiQueryRef = useRef("");
const searchRef = useRef("");

const loadRequestRef = useRef(0);

  const [spinning, setSpinning] = useState(false);
  const [rouletteTopic, setRouletteTopic] = useState<Topic | null>(null);
  const [activeTopic, setActiveTopic] = useState<Topic | null>(null);

  const [duration, setDuration] = useState(10);
  const [customDuration, setCustomDuration] = useState("15");
  const [timeLeft, setTimeLeft] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);

  const [transcript, setTranscript] = useState("");
const [recording, setRecording] = useState(false);
const [speechMessage, setSpeechMessage] = useState("");

const [analysisLoading, setAnalysisLoading] = useState(false);
const [analysisError, setAnalysisError] = useState("");
const [analysisFeedback, setAnalysisFeedback] = useState<any>(null);

const transcriptRef = useRef("");
const analyzeAfterRecordingRef = useRef(false);

  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [completed, setCompleted] = useState<string[]>([]);

  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizAnswer, setQuizAnswer] = useState("");
  const [quizScore, setQuizScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);

  const spinTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

const [rouletteIndex, setRouletteIndex] = useState(0);
const [carouselSpeed, setCarouselSpeed] = useState(65);
  const recognition = useRef<any>(null);

  
  
  // LOAD FIRST TOPIC BATCH
  const loadTopics = useCallback(
    async (selectedCategory: string, query = "") => {
      const requestId = ++loadRequestRef.current;

      categoryRef.current = selectedCategory;
      apiQueryRef.current = query.trim();

      topicsRef.current = [];
      apiPageRef.current = 1;
      hasMoreTopicsRef.current = false;
      loadingMoreTopicsRef.current = false;

      setLoading(true);
      setLoadingMoreTopics(false);
      setTopics([]);
      setApiPage(1);
      setHasMoreTopics(false);
      setDiscoveryPage(1);

      try {
        const params = new URLSearchParams({
          category: selectedCategory,
          page: "1",
        });

        if (query.trim()) {
          params.set("q", query.trim());
        }

        const response = await fetch(`/api/topics?${params}`);

        if (!response.ok) {
          throw new Error("Unable to load topics");
        }

        const data = await response.json();

        // Ignore outdated requests after a category change.
        if (requestId !== loadRequestRef.current) return;

        const incoming: Topic[] = data.topics || [];

        topicsRef.current = incoming;
        apiPageRef.current = 1;
        hasMoreTopicsRef.current = Boolean(data.hasMore);

        setTopics(incoming);
        setApiPage(1);
        setHasMoreTopics(Boolean(data.hasMore));
      } catch (error) {
        if (requestId === loadRequestRef.current) {
          console.error("Topic loading error:", error);

          topicsRef.current = [];
          hasMoreTopicsRef.current = false;

          setTopics([]);
          setHasMoreTopics(false);
        }
      } finally {
        if (requestId === loadRequestRef.current) {
          setLoading(false);
        }
      }
    },
    []
  );

  // FETCH ANOTHER TOPIC BATCH
  const loadMoreTopics = useCallback(async (): Promise<boolean> => {
    if (
      loadingMoreTopicsRef.current ||
      !hasMoreTopicsRef.current
    ) {
      return false;
    }

    loadingMoreTopicsRef.current = true;
    setLoadingMoreTopics(true);

    const requestId = loadRequestRef.current;
    const nextPage = apiPageRef.current + 1;

    try {
      const params = new URLSearchParams({
        category: categoryRef.current,
        page: String(nextPage),
      });

      if (apiQueryRef.current) {
        params.set("q", apiQueryRef.current);
      }

      const response = await fetch(`/api/topics?${params}`);

      if (!response.ok) {
        throw new Error("Unable to load more topics");
      }

      const data = await response.json();

      // Don't append results belonging to an old category.
      if (requestId !== loadRequestRef.current) {
        return false;
      }

      const incoming: Topic[] = data.topics || [];

      const existingIds = new Set(
        topicsRef.current.map((topic) => topic.id)
      );

      const newTopics = incoming.filter(
        (topic) => !existingIds.has(topic.id)
      );

      const updatedTopics = [
        ...topicsRef.current,
        ...newTopics,
      ];

      topicsRef.current = updatedTopics;
      apiPageRef.current = nextPage;
      hasMoreTopicsRef.current = Boolean(data.hasMore);

      setTopics(updatedTopics);
      setApiPage(nextPage);
      setHasMoreTopics(Boolean(data.hasMore));

      return (
        newTopics.length > 0 ||
        Boolean(data.hasMore)
      );
    } catch (error) {
      console.error("Additional topic loading error:", error);
      return false;
    } finally {
      loadingMoreTopicsRef.current = false;
      setLoadingMoreTopics(false);
    }
  }, []);



  // INITIAL LOAD AND LOCAL STORAGE
  useEffect(() => {
    loadTopics("All");

    try {
      setBookmarks(
        JSON.parse(localStorage.getItem("rapidlearn-bookmarks") || "[]")
      );

      setCompleted(
        JSON.parse(localStorage.getItem("rapidlearn-completed") || "[]")
      );
    } catch {
      setBookmarks([]);
      setCompleted([]);
    }
  }, [loadTopics]);

  // TIMER
  useEffect(() => {
    if (!timerRunning) return;

    // Automatically move to the speaking page when time expires.
    if (timeLeft <= 0) {
      setTimerRunning(false);

      if (activeTopic) {
        setCompleted((previous) => {
          const next = Array.from(
            new Set([...previous, activeTopic.id])
          );

          localStorage.setItem(
            "rapidlearn-completed",
            JSON.stringify(next)
          );

          return next;
        });
      }

      setTranscript("");
      setSpeechMessage(
        "Your learning session is complete. Now explain what you learned!"
      );
      setPage("speak");

      return;
    }

    const timeout = setTimeout(() => {
      setTimeLeft((previous) => Math.max(0, previous - 1));
    }, 1000);

    return () => clearTimeout(timeout);
  }, [timerRunning, timeLeft, activeTopic]);

  // CLEANUP
useEffect(() => {
  return () => {
    if (spinTimeout.current) {
      clearTimeout(spinTimeout.current);
    }

    recognition.current?.stop?.();
  };
}, []);

 
  // FILTER TOPICS
  const filteredTopics = useMemo(() => {
    if (!search.trim()) return topics;

    return topics.filter((topic) =>
      topic.title.toLowerCase().includes(search.toLowerCase())
    );
  }, [topics, search]);

  // TODAY'S DISCOVERY PAGINATION
  const totalDiscoveryPages = Math.max(
    1,
    Math.ceil(filteredTopics.length / TOPICS_PER_PAGE)
  );

  const visibleTopics = useMemo(() => {
    const start = (discoveryPage - 1) * TOPICS_PER_PAGE;

    return filteredTopics.slice(
      start,
      start + TOPICS_PER_PAGE
    );
  }, [filteredTopics, discoveryPage]);

  // Navigate and fetch as many batches as necessary.
  const goToDiscoveryPage = async (nextPage: number) => {
    if (
      nextPage < 1 ||
      loadingMoreTopicsRef.current
    ) {
      return;
    }

    const requiredTopics = nextPage * TOPICS_PER_PAGE;

    const getMatchingCount = () => {
      const query = searchRef.current.trim().toLowerCase();

      if (!query) {
        return topicsRef.current.length;
      }

      return topicsRef.current.filter((topic) =>
        topic.title.toLowerCase().includes(query)
      ).length;
    };

    // Continue fetching until the requested page is available
    // or the API sources have no more results.
    while (
      getMatchingCount() < requiredTopics &&
      hasMoreTopicsRef.current
    ) {
      const success = await loadMoreTopics();

      if (!success) break;
    }

    const matchingCount = getMatchingCount();

    const availablePages = Math.max(
      1,
      Math.ceil(matchingCount / TOPICS_PER_PAGE)
    );

    setDiscoveryPage(
      Math.min(nextPage, availablePages)
    );
  };


  // BOOKMARKS
  const toggleBookmark = (topic: Topic) => {
    const next = bookmarks.includes(topic.id)
      ? bookmarks.filter((id) => id !== topic.id)
      : [...bookmarks, topic.id];

    setBookmarks(next);

    localStorage.setItem(
      "rapidlearn-bookmarks",
      JSON.stringify(next)
    );
  };

  // COMPLETED TOPICS
  const markCompleted = (topic: Topic) => {
    const next = Array.from(
      new Set([...completed, topic.id])
    );

    setCompleted(next);

    localStorage.setItem(
      "rapidlearn-completed",
      JSON.stringify(next)
    );
  };

  // RAPIDLEARN ROULETTE — CINEMATIC CAROUSEL
const spinRoulette = () => {
  if (spinning || topics.length === 0) return;

  if (spinTimeout.current) {
    clearTimeout(spinTimeout.current);
  }

  setSpinning(true);
  setRouletteTopic(null);

  // Begin at a random position.
  let currentIndex = Math.floor(
    Math.random() * topics.length
  );

  setRouletteIndex(currentIndex);

  // Fast initial movement.
  let delay = 65;

  // Number of carousel movements.
  const maxTicks = 40 + Math.floor(Math.random() * 12);

  let ticks = 0;

  setCarouselSpeed(delay);

  const animate = () => {
    ticks++;

    // Move to the next topic.
    currentIndex = (currentIndex + 1) % topics.length;

    setRouletteIndex(currentIndex);
    setRouletteTopic(topics[currentIndex]);

    // Gradually slow down near the end.
    if (ticks > maxTicks - 12) {
      delay += 32;
    }

    setCarouselSpeed(delay);

    if (ticks >= maxTicks) {
      // Select the final winning topic.
      const winnerIndex = Math.floor(
        Math.random() * topics.length
      );

      const winner = topics[winnerIndex];

      setRouletteIndex(winnerIndex);
      setRouletteTopic(winner);
      setActiveTopic(winner);

      // Allow the carousel to settle before showing the button.
      setCarouselSpeed(600);

      spinTimeout.current = setTimeout(() => {
        setSpinning(false);
        spinTimeout.current = null;
      }, 650);

      return;
    }

    spinTimeout.current = setTimeout(animate, delay);
  };

  spinTimeout.current = setTimeout(animate, delay);
};

  // START LEARNING
  const startLearning = (topic: Topic) => {
    setActiveTopic(topic);
    setTimeLeft(duration * 60);
    setTimerRunning(true);
    setPage("learn");
  };

  // TIMER FORMATTING
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(
      remainingSeconds
    ).padStart(2, "0")}`;
  };

  // FINISH LEARNING EARLY
  const finishLearning = () => {
    setTimerRunning(false);

    if (activeTopic) {
      markCompleted(activeTopic);
    }

    setTranscript("");
    setSpeechMessage(
      "Your learning session is complete. Now explain what you learned!"
    );

    setPage("speak");
  };


// GEMINI AI TEACH-BACK ANALYSIS
const analyzeExplanation = async (spokenText: string) => {
  const explanation = spokenText.trim();

  if (!activeTopic) {
    setAnalysisError("No learning topic was selected.");
    return;
  }

  if (explanation.split(/\s+/).filter(Boolean).length < 10) {
    setAnalysisError(
      "Please explain a little more before requesting your analysis."
    );
    return;
  }

  setAnalysisLoading(true);
  setAnalysisError("");
  setAnalysisFeedback(null);

  try {
    const response = await fetch("/api/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        topic: activeTopic.title,
        description: activeTopic.description,
        transcript: explanation,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error || "Unable to analyze your explanation."
      );
    }

    if (!data.feedback) {
      throw new Error("The AI returned an invalid feedback response.");
    }

    setAnalysisFeedback(data.feedback);
    setSpeechMessage("Your learning analysis is ready!");
  } catch (error) {
    setAnalysisError(
      error instanceof Error
        ? error.message
        : "Something went wrong during AI analysis."
    );
  } finally {
    setAnalysisLoading(false);
  }
};



  // SPEECH RECOGNITION
  const startRecording = () => {
    if (typeof window === "undefined") return;

    const SpeechRecognitionConstructor =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionConstructor) {
      setSpeechMessage(
        "Speech recognition isn't supported in this browser. Try Chrome or Edge, or type your explanation below."
      );

      return;
    }

    try {
      const instance = new SpeechRecognitionConstructor();

      instance.continuous = true;
      instance.interimResults = true;
      instance.lang = "en-IN";

      instance.onresult = (event: any) => {
        let finalText = "";
        let interimText = "";

        for (
          let i = event.resultIndex;
          i < event.results.length;
          i++
        ) {
          const recognizedText =
            event.results[i][0].transcript;

          if (event.results[i].isFinal) {
            finalText += recognizedText + " ";
          } else {
            interimText += recognizedText;
          }
        }

        if (finalText) {
  setTranscript((previous) => {
    const updated = previous + finalText;
    transcriptRef.current = updated;
    return updated;
  });
}

        setSpeechMessage(
          interimText
            ? `Listening: ${interimText}`
            : "Listening..."
        );
      };

      instance.onerror = (event: any) => {
        setSpeechMessage(
          `Microphone error: ${event.error || "unknown error"}`
        );

        setRecording(false);
      };

      instance.onend = () => {
  setRecording(false);

  if (analyzeAfterRecordingRef.current) {
    analyzeAfterRecordingRef.current = false;

    analyzeExplanation(transcriptRef.current);
  }
};

      recognition.current = instance;
      instance.start();

      setRecording(true);
      setSpeechMessage("Listening... speak naturally.");
    } catch {
      setSpeechMessage(
        "Unable to start microphone. Please try again."
      );
    }
  };

  const stopRecording = () => {
    recognition.current?.stop?.();

    setRecording(false);

    setSpeechMessage(
      "Recording stopped. Review or edit your explanation."
    );
  };

  // QUIZ LOADING
  const loadQuiz = async () => {
    setQuizLoading(true);
    setQuizFinished(false);
    setQuizIndex(0);
    setQuizScore(0);
    setQuizAnswer("");

    try {
      const response = await fetch("/api/quiz");

      if (!response.ok) {
        const errorData = await response.json();

        throw new Error(
          errorData.error || "Quiz unavailable"
        );
      }

      const data = await response.json();

      setQuestions(data.questions || []);
      setPage("quiz");
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Unable to load quiz."
      );
    } finally {
      setQuizLoading(false);
    }
  };

  // ANSWER QUIZ
  const answerQuiz = (answer: string) => {
    if (quizAnswer || !questions[quizIndex]) return;

    setQuizAnswer(answer);

    if (answer === questions[quizIndex].correct_answer) {
      setQuizScore((previous) => previous + 1);
    }
  };

  // NEXT QUESTION
  const nextQuestion = () => {
    if (quizIndex + 1 >= questions.length) {
      setQuizFinished(true);
    } else {
      setQuizIndex((previous) => previous + 1);
      setQuizAnswer("");
    }
  };

  // SHUFFLE ANSWERS
  const shuffledAnswers = useMemo(() => {
    if (!questions[quizIndex]) return [];

    return [
      ...questions[quizIndex].incorrect_answers,
      questions[quizIndex].correct_answer,
    ].sort((a, b) => a.localeCompare(b));
  }, [questions, quizIndex]);

  const dailyTopic = topics[0];

  // OPEN TOPIC WITHOUT STARTING TIMER
  const openTopic = (topic: Topic) => {
    setActiveTopic(topic);
    setPage("learn");
    setTimeLeft(duration * 60);
    setTimerRunning(false);
  };

  // HOME NAVIGATION
  const goHome = () => {
    setTimerRunning(false);
    setPage("home");
  };

  const progress =
    timeLeft > 0
      ? ((duration * 60 - timeLeft) / (duration * 60)) * 100
      : 0;

  return (
    <main className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={goHome}>
          <span className="brand-mark">
            <Zap size={20} fill="currentColor" />
          </span>

          <span>
            rapid<span>learn</span>
          </span>
        </button>

        <nav className="desktop-nav">
          <button
            className={page === "home" ? "nav-active" : ""}
            onClick={goHome}
          >
            Discover
          </button>

          <button onClick={loadQuiz}>Daily quiz</button>

          <button
            onClick={() => {
              setCategory("All");
              loadTopics("All");
              goHome();
            }}
          >
            Explore
          </button>
        </nav>

        <div className="topbar-right">
          <span className="free-label">
            <span className="online-dot" />
            FREE LEARNING
          </span>

          <div className="avatar">
            <GraduationCap size={19} />
          </div>
        </div>
      </header>

      {/* HOME PAGE */}
      {page === "home" && (
        <>
          <section className="hero">
            <div className="hero-content">
              <div className="eyebrow">
                <Sparkles size={14} />
                YOUR DAILY DOSE OF KNOWLEDGE
              </div>

              <h1>
                Make every
                <br />
                minute <span>count.</span>
              </h1>

              <p>
                Less scrolling. More knowing.
                <br />
                Discover something fascinating today.
              </p>

              <div className="hero-actions">
                <button
                  className="primary-button"
                  onClick={spinRoulette}
                  disabled={
                    spinning || loading || topics.length === 0
                  }
                >
                  {spinning ? (
                    <LoaderCircle
                      className="spin-icon"
                      size={18}
                    />
                  ) : (
                    <Zap size={18} />
                  )}

                  {spinning
                    ? "Spinning..."
                    : "Spin & discover"}

                  <ArrowRight size={17} />
                </button>

                <span className="hero-note">
                  <Clock3 size={14} />
                  Just 10 minutes a day
                </span>
              </div>
            </div>

            <div className="hero-art">
              <div className="orbit orbit-one" />
              <div className="orbit orbit-two" />
              <div className="hero-glow" />

              <div className="floating-card card-top">
                <span className="float-icon purple">
                  <Globe2 size={18} />
                </span>

                <span>
                  <b>Explore</b>
                  <small>New perspectives</small>
                </span>
              </div>

              <div className="planet">
                <div className="planet-inner">
                  <Lightbulb
                    size={65}
                    strokeWidth={1.2}
                  />
                </div>
              </div>

              <div className="floating-card card-bottom">
                <span className="float-icon orange">
                  <Flame size={18} />
                </span>

                <span>
                  <b>Stay curious</b>
                  <small>One topic at a time</small>
                </span>
              </div>

              <div className="sparkle sparkle-one">✦</div>
              <div className="sparkle sparkle-two">✧</div>
            </div>
          </section>

          {/* STATISTICS */}
          <section className="stats-row">
            <div className="stat">
              <span className="stat-icon purple">
                <BookOpen size={18} />
              </span>

              <span>
                <b>{topics.length || "—"}</b>
                <small>Topics loaded</small>
              </span>
            </div>

            <div className="stat">
              <span className="stat-icon orange">
                <Flame size={18} />
              </span>

              <span>
                <b>{completed.length}</b>
                <small>Topics learned</small>
              </span>
            </div>

            <div className="stat">
              <span className="stat-icon green">
                <Star size={18} />
              </span>

              <span>
                <b>{bookmarks.length}</b>
                <small>Saved topics</small>
              </span>
            </div>
          </section>

          {/* ROULETTE */}
          <section className="section roulette-section">
            <div className="section-heading">
              <div>
                <div className="eyebrow">
                  THE FUN WAY TO LEARN
                </div>

                <h2>
                  RapidLearn roulette <span>✦</span>
                </h2>

                <p>
                  Let curiosity choose your next adventure.
                </p>
              </div>

              <span className="section-number">
                01 / DISCOVER
              </span>
            </div>

            <div className="roulette-panel">
              <div className="roulette-copy">
                <span className="roulette-tag">
                  <Sparkles size={13} />
                  RANDOM KNOWLEDGE GENERATOR
                </span>

                <h3>Not sure what to learn?</h3>

                <p>
                  Set your interests, spin the roulette, and let
                  us surprise you with something worth knowing.
                </p>

                <div className="roulette-categories">
                  {categories.map((item) => (
                    <button
                      key={item}
                      className={
                        category === item
                          ? "category-chip selected"
                          : "category-chip"
                      }
                      onClick={() => {
                        setCategory(item);
                        setRouletteTopic(null);
                        loadTopics(item);
                      }}
                    >
                      {item}
                    </button>
                  ))}
                </div>

                <div className="roulette-actions">
                  <button
                    className="primary-button"
                    onClick={spinRoulette}
                    disabled={
                      spinning || loading || topics.length === 0
                    }
                  >
                    {spinning ? (
                      <LoaderCircle
                        className="spin-icon"
                        size={17}
                      />
                    ) : (
                      <RotateCcw size={17} />
                    )}

                    {spinning
                      ? "Finding your topic..."
                      : "Spin the roulette"}
                  </button>

                  <span className="tiny-note">
                    {loading
                      ? "Loading discoveries..."
                      : `${topics.length} discoveries ready`}
                  </span>
                </div>
              </div>

              <div className="roulette-display">

  <div className="roulette-decoration decoration-a">
    ✦
  </div>

  <div className="roulette-decoration decoration-b">
    ✧
  </div>

  {/* CAROUSEL */}
  <div
    className={`roulette-carousel ${
      spinning ? "carousel-spinning" : ""
    }`}
    style={
      {
        "--carousel-speed": `${carouselSpeed}ms`,
      } as CSSProperties
    }
  >
    {topics.length > 0 &&
      [-2, -1, 0, 1, 2].map((offset) => {
        const index =
          (rouletteIndex + offset + topics.length) %
          topics.length;

        const topic = topics[index];

        const isCenter = offset === 0;

        return (
          <div
            key={`${offset}-${topic.id}`}
            className={[
              "roulette-carousel-card",
              `carousel-pos-${offset}`,
              isCenter ? "carousel-center" : "",
            ].join(" ")}
          >
            {topic.image ? (
              <img
                src={topic.image}
                alt={topic.title}
              />
            ) : (
              <div className="carousel-placeholder">
                <Lightbulb size={42} />
              </div>
            )}

            <div className="carousel-card-overlay">
              <span>{topic.category}</span>

              <h3>{topic.title}</h3>

              <p>
                {topic.description?.slice(0, 85)}
              </p>
            </div>

            {isCenter && (
              <div className="carousel-selected-indicator">
                <Sparkles size={14} />
              </div>
            )}
          </div>
        );
      })}

    {topics.length === 0 && (
      <div className="carousel-empty">
        <Lightbulb size={42} />
        <p>Discoveries will appear here</p>
      </div>
    )}
  </div>

  {/* CAROUSEL STATUS */}
  <div className="carousel-status">
    {spinning ? (
      <>
        <LoaderCircle
          size={14}
          className="spin-icon"
        />
        Exploring the world of knowledge...
      </>
    ) : rouletteTopic ? (
      <>
        <Sparkles size={14} />
        Your next discovery is ready!
      </>
    ) : (
      <>
        <Compass size={14} />
        Your next discovery awaits
      </>
    )}
  </div>

  {/* WINNER BUTTON */}
  {rouletteTopic && !spinning && (
    <button
      className="ticket-open"
      onClick={() => openTopic(rouletteTopic)}
    >
      Explore this topic
      <ArrowRight size={15} />
    </button>
  )}

</div>
            </div>
          </section>

          {/* TODAY'S DISCOVERIES */}
          <section className="section">
            <div className="section-heading compact-heading">
              <div>
                <div className="eyebrow">
                  A LITTLE SOMETHING FOR TODAY
                </div>

                <h2>Today's discoveries</h2>

                <p>
                  Interesting things to feed your curiosity.
                </p>
              </div>

              <button
                className="text-button"
                onClick={() => loadTopics(category)}
              >
                Refresh <RotateCcw size={14} />
              </button>
            </div>

            <div className="search-box">
              <Search size={18} />

              <input
                value={search}
               onChange={(event) => {
  const value = event.target.value;

  searchRef.current = value;
  setSearch(value);
  setDiscoveryPage(1);
}}
                placeholder="Search for something fascinating..."
              />

              {search && (
                <button
  onClick={() => {
    setSearch("");
    setDiscoveryPage(1);
  }}
>
                  <X size={16} />
                </button>
              )}
            </div>

            {loading ? (
              <div className="loading-state">
                <LoaderCircle
                  className="spin-icon"
                  size={26}
                />
                <span>
                  Discovering something interesting...
                </span>
              </div>
            ) : filteredTopics.length === 0 ? (
              <div className="empty-state">
                <Search size={28} />
                <h3>No discoveries found</h3>
                <p>
                  Try another search or select a different
                  category.
                </p>
              </div>
            ) : (
              <div className="topic-grid">
  {visibleTopics.map((topic, index) => (
                  <article
                    className="discovery-card"
                    key={topic.id}
                  >
                    <button
                      className="bookmark-button"
                      onClick={() => toggleBookmark(topic)}
                      aria-label="Bookmark topic"
                    >
                      <Bookmark
                        size={17}
                        fill={
                          bookmarks.includes(topic.id)
                            ? "currentColor"
                            : "none"
                        }
                      />
                    </button>

                    <button
                      className="discovery-image"
                      onClick={() => openTopic(topic)}
                    >
                      {topic.image ? (
                        <img
                          src={topic.image}
                          alt={topic.title}
                        />
                      ) : (
                        <div className="image-fallback">
                          <Lightbulb size={36} />
                        </div>
                      )}

                      <span className="image-index">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                    </button>

                    <div className="discovery-content">
                      <div className="card-meta">
                        <span>{topic.category}</span>
                        <span className="source-label">
                          {topic.source}
                        </span>
                      </div>

                      <h3>{topic.title}</h3>
                      <p>{topic.description}</p>

                      <button
                        className="card-read"
                        onClick={() => openTopic(topic)}
                      >
                        Explore topic
                        <ArrowRight size={15} />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}

            {/* TODAY'S DISCOVERY PAGINATION */}
<div className="discovery-pagination">
  <button
    className="pagination-button"
    onClick={() => goToDiscoveryPage(discoveryPage - 1)}
    disabled={discoveryPage === 1 || loadingMoreTopics}
  >
    <ArrowLeft size={15} />
    Previous
  </button>

  <div className="pagination-pages">
    {Array.from(
      { length: totalDiscoveryPages },
      (_, index) => index + 1
    ).map((number) => (
      <button
        key={number}
        className={
          discoveryPage === number
            ? "pagination-number active"
            : "pagination-number"
        }
        onClick={() => goToDiscoveryPage(number)}
        disabled={loadingMoreTopics}
      >
        {number}
      </button>
    ))}

    {hasMoreTopics && (
      <span className="pagination-more">…</span>
    )}
  </div>

  <button
    className="pagination-button"
    onClick={() => goToDiscoveryPage(discoveryPage + 1)}
    disabled={
      loadingMoreTopics ||
      (discoveryPage >= totalDiscoveryPages && !hasMoreTopics)
    }
  >
    {loadingMoreTopics ? (
      <LoaderCircle size={15} className="spin-icon" />
    ) : (
      <ArrowRight size={15} />
    )}
    {loadingMoreTopics ? "Loading" : "Next"}
  </button>
</div>

<div className="discovery-page-info">
  Showing {visibleTopics.length} of {filteredTopics.length} loaded topics
  {hasMoreTopics ? " · More discoveries available" : " · No more API results"}
</div>
          </section>

          {/* DAILY FACT */}
          <section className="section daily-section">
            <div className="daily-card">
              <div className="daily-copy">
                <span className="eyebrow">
                  YOUR DAILY CURIOSITY BOOST
                </span>

                <h2>
                  One small fact.
                  <br />
                  <span>A bigger world.</span>
                </h2>

                <p>
                  {dailyTopic
                    ? dailyTopic.description.slice(0, 210) + "..."
                    : "Every day is a chance to discover something new."}
                </p>

                {dailyTopic && (
                  <button
                    className="text-button"
                    onClick={() => openTopic(dailyTopic)}
                  >
                    Discover more
                    <ArrowRight size={15} />
                  </button>
                )}
              </div>

              <div className="daily-icon">
                <Lightbulb
                  size={72}
                  strokeWidth={1.1}
                />
                <span>✦</span>
              </div>
            </div>
          </section>

          {/* QUIZ PROMO */}
          <section className="section quiz-promo">
            <div>
              <span className="eyebrow">
                TEST YOUR KNOWLEDGE
              </span>

              <h2>Think you know it all?</h2>

              <p>
                Take a quick quiz and give your brain a little
                workout.
              </p>
            </div>

            <button
              className="primary-button"
              onClick={loadQuiz}
              disabled={quizLoading}
            >
              {quizLoading ? (
                <LoaderCircle
                  className="spin-icon"
                  size={17}
                />
              ) : (
                <Zap size={17} />
              )}

              Start daily quiz
              <ArrowRight size={16} />
            </button>
          </section>
        </>
      )}

      {/* LEARNING PAGE */}
      {page === "learn" && activeTopic && (
        <section className="learning-page">
          <button className="back-button" onClick={goHome}>
            <ArrowLeft size={17} />
            Back to discoveries
          </button>

          <div className="learning-layout">
            <article className="learning-article">
              <div className="learning-meta">
                <span>{activeTopic.category}</span>

                <span>
                  FROM {activeTopic.source.toUpperCase()}
                </span>
              </div>

              <h1>{activeTopic.title}</h1>

              {activeTopic.image && (
                <img
                  className="learning-cover"
                  src={activeTopic.image}
                  alt={activeTopic.title}
                />
              )}

              <div className="article-content">
                <div className="article-intro">
                  <Sparkles size={19} />

                  <p>
                    Your next little journey into knowledge
                    starts here. Take your time, stay curious,
                    and see what you discover.
                  </p>
                </div>

                <h2>Let's understand this</h2>

                <p>{activeTopic.description}</p>

                <div className="article-tip">
                  <Lightbulb size={20} />

                  <p>
                    <b>Learning tip:</b> As you read, try to
                    remember three interesting things you could
                    explain to someone else.
                  </p>
                </div>

                <a
                  className="source-link"
                  href={activeTopic.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  Read the full source
                  <ArrowRight size={15} />
                </a>
              </div>
            </article>

            {/* LEARNING TIMER */}
            <aside className="learning-sidebar">
              <div className="timer-card">
                <div className="timer-heading">
                  <span>
                    <Clock3 size={17} />
                    FOCUS SESSION
                  </span>

                  <span className="timer-live">
                    <span />
                    {timerRunning ? "ACTIVE" : "PAUSED"}
                  </span>
                </div>

                <div
                  className="timer-circle"
                  style={
                    {
                      "--progress": `${progress}%`,
                    } as CSSProperties
                  }
                >
                  <div>
                    <strong>{formatTime(timeLeft)}</strong>
                    <small>TIME LEFT</small>
                  </div>
                </div>

                <div className="timer-presets">
                  {[10, 20, 30].map((value) => (
                    <button
                      key={value}
                      className={
                        duration === value
                          ? "preset-active"
                          : ""
                      }
                      onClick={() => {
                        setDuration(value);
                        setTimeLeft(value * 60);
                        setTimerRunning(false);
                      }}
                    >
                      {value} min
                    </button>
                  ))}
                </div>

                <div className="custom-time">
                  <label htmlFor="custom-duration">
                    Custom minutes
                  </label>

                  <input
                    id="custom-duration"
                    type="number"
                    min="1"
                    max="180"
                    value={customDuration}
                    onChange={(event) =>
                      setCustomDuration(event.target.value)
                    }
                  />

                  <button
                    onClick={() => {
                      const value = Math.max(
                        1,
                        Math.min(
                          180,
                          Number(customDuration) || 10
                        )
                      );

                      setDuration(value);
                      setTimeLeft(value * 60);
                      setTimerRunning(false);
                    }}
                  >
                    Set
                  </button>
                </div>

                <div className="timer-controls">
                  <button
                    className="timer-play"
                    onClick={() => {
                      if (timeLeft <= 0) {
                        setTimeLeft(duration * 60);
                      }

                      setTimerRunning((previous) => !previous);
                    }}
                  >
                    {timerRunning ? (
                      <Pause size={17} />
                    ) : (
                      <Play size={17} />
                    )}

                    {timerRunning ? "Pause" : "Start focus"}
                  </button>

                  <button
                    className="timer-reset"
                    onClick={() => {
                      setTimerRunning(false);
                      setTimeLeft(duration * 60);
                    }}
                    aria-label="Reset timer"
                  >
                    <RotateCcw size={17} />
                  </button>
                </div>
              </div>

              <div className="sidebar-tip">
                <Lightbulb size={19} />
                <b>Remember this</b>

                <p>
                  Understanding something well is more
                  important than reading quickly.
                </p>
              </div>

              <button
                className="finish-button"
                onClick={finishLearning}
              >
                I'm ready to explain it
                <ArrowRight size={17} />
              </button>
            </aside>
          </div>
        </section>
      )}

      {/* SPEAKING PAGE */}
      {page === "speak" && activeTopic && (
        <section className="speak-page">
          <button
            className="back-button"
            onClick={() => setPage("learn")}
          >
            <ArrowLeft size={17} />
            Back to learning
          </button>

          <div className="speak-container">
            <div className="eyebrow">
              THE BEST WAY TO LEARN IS TO TEACH
            </div>

            <h1>
              Your turn to <span>explain.</span>
            </h1>

            <p className="speak-subtitle">
              Explain what you learned in your own words. Don't
              worry about being perfect. Just share what you
              understood.
            </p>

            <div className="speak-topic">
              <span className="topic-mini-icon">
                <BookOpen size={19} />
              </span>

              <span>
                <small>YOUR LEARNING TOPIC</small>
                <b>{activeTopic.title}</b>
              </span>

              <Check size={19} className="topic-check" />
            </div>

            <div className="record-card">
              <div
                className={
                  recording
                    ? "mic-orb recording"
                    : "mic-orb"
                }
              >
                {recording ? (
                  <Mic size={34} />
                ) : (
                  <MicOff size={34} />
                )}
              </div>

              <h2>
                {recording
                  ? "We're listening..."
                  : "Tell us what you learned"}
              </h2>

              <p>
                Speak naturally. You can pause, take a breath,
                and continue.
              </p>

              <button
                className={
                  recording
                    ? "record-button recording-button"
                    : "record-button"
                }
                onClick={
                  recording
                    ? stopRecording
                    : startRecording
                }
              >
                {recording ? (
                  <MicOff size={18} />
                ) : (
                  <Mic size={18} />
                )}

                {recording
                  ? "Stop recording"
                  : "Start speaking"}
              </button>

              {speechMessage && (
                <p className="speech-status">
                  {speechMessage}
                </p>
              )}

              <div className="transcript-area">
                <div className="transcript-heading">
                  <span>
                    <Volume2 size={16} />
                    YOUR EXPLANATION
                  </span>

                  <span>EDITABLE TRANSCRIPT</span>
                </div>

                <textarea
                  value={transcript}
                  onChange={(event) => {
  transcriptRef.current = event.target.value;
  setTranscript(event.target.value);
}}
                  placeholder="Your spoken explanation will appear here. You can also type your explanation..."
                />

                <div className="transcript-footer">
                  <span>
                    {
                      transcript
                        .trim()
                        .split(/\s+/)
                        .filter(Boolean).length
                    }{" "}
                    words
                  </span>

                  <button
                    onClick={() => setTranscript("")}
                  >
                    Clear text
                  </button>
                </div>
              </div>
            </div>

           
{analysisLoading ? (
  <div className="feedback-placeholder">
    <LoaderCircle className="spin-icon" size={24} />
    <div>
      <b>Analyzing your explanation...</b>
      <p>
        Your AI learning coach is evaluating your understanding,
        accuracy and knowledge gaps. This may take a few seconds.
      </p>
    </div>
  </div>
) : analysisError ? (
  <div className="feedback-placeholder">
    <Sparkles size={22} />
    <div>
      <b>Analysis couldn't be completed</b>
      <p>{analysisError}</p>
    </div>
  </div>
) : analysisFeedback ? (
  <div className="feedback-placeholder">
    <Sparkles size={22} />
    <div>
      <b>Your AI learning assessment</b>

      <h2>
        {analysisFeedback.overallScore}/100
      </h2>

      <p>{analysisFeedback.summary}</p>

      <h3>Understanding</h3>
      <p>{analysisFeedback.understandingScore}/100</p>

      <h3>Factual accuracy</h3>
      <p>{analysisFeedback.accuracyScore}/100</p>

      <h3>Completeness</h3>
      <p>{analysisFeedback.completenessScore}/100</p>

      <h3>Clarity</h3>
      <p>{analysisFeedback.clarityScore}/100</p>

      <h3>What you explained well</h3>
      {analysisFeedback.strengths?.map(
        (item: string, index: number) => (
          <p key={index}>✓ {item}</p>
        )
      )}

      <h3>Things to correct</h3>
      {analysisFeedback.corrections?.map(
        (item: string, index: number) => (
          <p key={index}>• {item}</p>
        )
      )}

      <h3>Important points you missed</h3>
      {analysisFeedback.missingPoints?.map(
        (item: string, index: number) => (
          <p key={index}>• {item}</p>
        )
      )}

      <h3>Recommended next steps</h3>
      {analysisFeedback.recommendations?.map(
        (item: string, index: number) => (
          <p key={index}>→ {item}</p>
        )
      )}

      <h3>Your coach says</h3>
      <p>{analysisFeedback.verdict}</p>
    </div>
  </div>
) : (
  <div className="feedback-placeholder">
    <Sparkles size={20} />
    <div>
      <b>Your personal AI learning coach</b>
      <p>
        Complete your explanation and select Analyze My Explanation
        to receive your personalized learning assessment.
      </p>
    </div>
  </div>
)}


            
<div className="speak-actions">
  <button
    className="secondary-button"
    disabled={analysisLoading}
    onClick={() => {
      recognition.current?.stop?.();
      analyzeAfterRecordingRef.current = false;
      setRecording(false);
      setPage("home");
    }}
  >
    Finish for now
  </button>

  <button
    className="primary-button"
    disabled={recording || analysisLoading}
    onClick={() => {
      if (recording) return;

      analyzeExplanation(transcriptRef.current);
    }}
  >
    {analysisLoading ? (
      <LoaderCircle className="spin-icon" size={17} />
    ) : (
      <Sparkles size={17} />
    )}

    {analysisLoading ? "Analyzing..." : "Analyze my explanation"}
  </button>
</div>


          </div>
        </section>
      )}

      {/* QUIZ PAGE */}
      {page === "quiz" && (
        <section className="quiz-page">
          <button className="back-button" onClick={goHome}>
            <ArrowLeft size={17} />
            Back to discoveries
          </button>

          <div className="quiz-container">
            {quizFinished ? (
              <div className="quiz-result">
                <div className="result-icon">
                  <GraduationCap size={42} />
                </div>

                <span className="eyebrow">
                  QUIZ COMPLETED
                </span>

                <h1>You did great!</h1>

                <p>
                  You answered {quizScore} out of{" "}
                  {questions.length} questions correctly.
                </p>

                <div className="score-circle">
                  {Math.round(
                    (quizScore /
                      Math.max(questions.length, 1)) *
                      100
                  )}
                  %
                </div>

                <button
                  className="primary-button"
                  onClick={loadQuiz}
                >
                  Try another quiz
                  <RotateCcw size={16} />
                </button>
              </div>
            ) : questions.length > 0 ? (
              <>
                <div className="eyebrow">
                  A LITTLE BRAIN WORKOUT
                </div>

                <h1>Daily knowledge quiz</h1>

                <div className="quiz-progress">
                  <div>
                    <span>
                      QUESTION {quizIndex + 1} OF{" "}
                      {questions.length}
                    </span>

                    <b>{quizScore} correct</b>
                  </div>

                  <div className="progress-track">
                    <span
                      style={{
                        width: `${
                          ((quizIndex +
                            (quizAnswer ? 1 : 0)) /
                            questions.length) *
                          100
                        }%`,
                      }}
                    />
                  </div>
                </div>

                <div className="question-card">
                  <div className="question-meta">
                    <span>
                      {questions[quizIndex].category}
                    </span>

                    <span>
                      {questions[quizIndex].difficulty}
                    </span>
                  </div>

                  <h2>
                    {questions[quizIndex].question}
                  </h2>

                  <div className="answer-list">
                    {shuffledAnswers.map(
                      (answer, index) => {
                        const isCorrect =
                          answer ===
                          questions[quizIndex].correct_answer;

                        const isSelected =
                          answer === quizAnswer;

                        return (
                          <button
                            key={`${quizIndex}-${index}`}
                            className={[
                              "answer-option",
                              quizAnswer && isCorrect
                                ? "answer-correct"
                                : "",
                              quizAnswer &&
                              isSelected &&
                              !isCorrect
                                ? "answer-wrong"
                                : "",
                            ].join(" ")}
                            onClick={() =>
                              answerQuiz(answer)
                            }
                            disabled={!!quizAnswer}
                          >
                            <span>
                              {String.fromCharCode(
                                65 + index
                              )}
                            </span>

                            {answer}

                            {quizAnswer && isCorrect && (
                              <Check size={17} />
                            )}

                            {quizAnswer &&
                              isSelected &&
                              !isCorrect && (
                                <X size={17} />
                              )}
                          </button>
                        );
                      }
                    )}
                  </div>

                  {quizAnswer && (
                    <button
                      className="primary-button next-question"
                      onClick={nextQuestion}
                    >
                      {quizIndex + 1 === questions.length
                        ? "See my result"
                        : "Next question"}

                      <ArrowRight size={16} />
                    </button>
                  )}
                </div>
              </>
            ) : (
              <div className="loading-state">
                <LoaderCircle
                  className="spin-icon"
                  size={26}
                />

                Loading your quiz...
              </div>
            )}
          </div>
        </section>
      )}

      {/* FOOTER */}
      <footer className="footer">
        <button
          className="footer-brand"
          onClick={goHome}
        >
          <Zap size={17} fill="currentColor" />
          rapidlearn
        </button>

        <span>Stay curious. Keep growing.</span>
        <span>Made for curious minds ✦</span>
      </footer>

      {/* MOBILE NAVIGATION */}
      <nav className="mobile-nav">
        <button
          className={
            page === "home" ? "mobile-active" : ""
          }
          onClick={goHome}
        >
          <Home size={20} />
          <span>Home</span>
        </button>

        <button
          onClick={spinRoulette}
          disabled={spinning || loading}
        >
          <Compass size={20} />
          <span>Spin</span>
        </button>

        <button onClick={loadQuiz}>
          <Zap size={20} />
          <span>Quiz</span>
        </button>

        <button
          onClick={() => {
            setSearch("");
            setCategory("All");
            loadTopics("All");
            goHome();
          }}
        >
          <Search size={20} />
          <span>Explore</span>
        </button>
      </nav>
    </main>
  );
}
