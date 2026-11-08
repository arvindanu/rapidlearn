
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

  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [completed, setCompleted] = useState<string[]>([]);

  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizAnswer, setQuizAnswer] = useState("");
  const [quizScore, setQuizScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);

  const spinInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const recognition = useRef<any>(null);

  // LOAD TOPICS
  const loadTopics = useCallback(
    async (selectedCategory: string, query = "") => {
      setLoading(true);

      try {
        const params = new URLSearchParams({
          category: selectedCategory,
        });

        if (query.trim()) {
          params.set("q", query.trim());
        }

        const response = await fetch(`/api/topics?${params.toString()}`);

        if (!response.ok) {
          throw new Error("Unable to load topics");
        }

        const data = await response.json();
        setTopics(data.topics || []);
      } catch (error) {
        console.error("Topic loading error:", error);
        setTopics([]);
      } finally {
        setLoading(false);
      }
    },
    []
  );

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
      if (spinInterval.current) {
        clearInterval(spinInterval.current);
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

  // RAPIDLEARN ROULETTE
  const spinRoulette = () => {
    if (spinning || topics.length === 0) return;

    if (spinInterval.current) {
      clearInterval(spinInterval.current);
    }

    setSpinning(true);
    setRouletteTopic(null);

    let ticks = 0;
    let speed = 65;

    const maxTicks = 32 + Math.floor(Math.random() * 15);

    const animate = () => {
      const randomTopic =
        topics[Math.floor(Math.random() * topics.length)];

      setRouletteTopic(randomTopic);
      ticks++;

      if (ticks >= maxTicks) {
        if (spinInterval.current) {
          clearInterval(spinInterval.current);
          spinInterval.current = null;
        }

        const winner =
          topics[Math.floor(Math.random() * topics.length)];

        setRouletteTopic(winner);
        setActiveTopic(winner);
        setSpinning(false);

        return;
      }

      if (ticks > maxTicks - 8) {
        speed += 28;

        if (spinInterval.current) {
          clearInterval(spinInterval.current);
        }

        spinInterval.current = setInterval(animate, speed);
      }
    };

    spinInterval.current = setInterval(animate, speed);
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
          setTranscript((previous) => previous + finalText);
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

                <div
                  className={
                    spinning
                      ? "topic-ticket ticket-spinning"
                      : "topic-ticket"
                  }
                >
                  {rouletteTopic?.image ? (
                    <img
                      src={rouletteTopic.image}
                      alt=""
                    />
                  ) : (
                    <div className="ticket-placeholder">
                      <Lightbulb size={42} />
                    </div>
                  )}

                  <div className="ticket-overlay">
                    <span>
                      {rouletteTopic?.category ||
                        "YOUR NEXT DISCOVERY"}
                    </span>

                    <h3>
                      {loading && !rouletteTopic
                        ? "Preparing discoveries..."
                        : rouletteTopic?.title ||
                          "What will you learn today?"}
                    </h3>

                    <p>
                      {rouletteTopic?.description?.slice(0, 105) ||
                        "A world of knowledge is just one spin away."}
                    </p>
                  </div>
                </div>

                {rouletteTopic && !spinning && (
                  <button
                    className="ticket-open"
                    onClick={() => openTopic(rouletteTopic)}
                  >
                    Open this topic
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
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search for something fascinating..."
              />

              {search && (
                <button onClick={() => setSearch("")}>
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
                {filteredTopics.slice(0, 12).map((topic, index) => (
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
                  onChange={(event) =>
                    setTranscript(event.target.value)
                  }
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

            <div className="feedback-placeholder">
              <Sparkles size={20} />

              <div>
                <b>
                  Coming next: Your personal learning coach
                </b>

                <p>
                  We'll connect a free local AI model to review
                  your explanation, highlight what you
                  understood, and gently suggest what to revisit.
                </p>
              </div>
            </div>

            <div className="speak-actions">
              <button
                className="secondary-button"
                onClick={() => {
                  recognition.current?.stop?.();
                  setRecording(false);
                  setPage("home");
                }}
              >
                Finish for now
              </button>

              <button
                className="primary-button"
                onClick={() => {
                  recognition.current?.stop?.();
                  setRecording(false);
                  setPage("home");
                  setTranscript("");
                }}
              >
                Done
                <Check size={17} />
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
