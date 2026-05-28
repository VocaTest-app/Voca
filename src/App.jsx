import { useEffect, useState } from 'react'
import { supabase } from './supabase'

function App() {

  console.log('앱 실행됨')

  const btnStyle = {
    width: '100%',
    padding: '12px',
    marginBottom: '10px',
    borderRadius: '8px',
    border: '1px solid #ddd',
    backgroundColor: '#fafafa',
    cursor: 'pointer',
    fontSize: '14px'
  }

  const [words, setWords] = useState([])
  const [question, setQuestion] = useState(null)
  const [choices, setChoices] = useState([])

  const [levelScore, setLevelScore] = useState(1.0)

  const [correctCount, setCorrectCount] = useState(0)
  const [wrongCount, setWrongCount] = useState(0)
  const [questionCount, setQuestionCount] = useState(0)

  const [streak, setStreak] = useState(0)
  const [wrongStreak, setWrongStreak] = useState(0)

  const [wrongWords, setWrongWords] = useState([])

  const [usedWords, setUsedWords] = useState([])

  const [isFinished, setIsFinished] = useState(false)

  const [testMode, setTestMode] = useState(null)

  const [currentStage, setCurrentStage] = useState('E')

  const [reviewMode, setReviewMode] = useState(false)
  const [reviewIndex, setReviewIndex] = useState(0)

  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [isAnswerChecked, setIsAnswerChecked] = useState(false)

  const [showContinue, setShowContinue] = useState(false);

  useEffect(() => {
    fetchWords()
  }, [])

  useEffect(() => {
    console.log('useEffect 실행됨', testMode, words.length)

    if (!testMode) return
    if (words.length === 0) return

    // 🔥 강등 로직 추가

    if (currentStage === 'M' && levelScore < 6) {
      setCurrentStage('E')
    }

    if (currentStage === 'H' && levelScore < 9) {
      setCurrentStage('M')
    }

    makeQuestion(words)

  }, [testMode, words])

  async function fetchWords() {

    const { data, error } = await supabase
      .from('words')
      .select('*', { count: 'exact' })
      .range(0, 9999)

    console.log('가져온 개수:', data.length)

    if (error) {
      console.log(error)
      return
    }

    setWords(data)

  }

  function makeQuestion(
    wordList,
    currentLevel = levelScore,
    currentMode = testMode
  ) {

    console.log('문제 생성 시작')  // 👈 추가

    console.log(
      'E 개수:',
      wordList.filter(w => w.level_group === 'E').length
    )

    console.log(
      'M 개수:',
      wordList.filter(w => w.level_group === 'M').length
    )

    console.log(
      'H 개수:',
      wordList.filter(w => w.level_group === 'H').length
    )

    const usedSet = new Set(usedWords)

    const suitableWords = wordList.filter(item => {

      let minDifficulty
      let maxDifficulty

      if (currentMode === 'elementary') {
        minDifficulty = currentLevel - 1
        maxDifficulty = currentLevel + 1
      }

      if (currentMode === 'middle') {
        minDifficulty = currentLevel - 1
        maxDifficulty = currentLevel + 1
      }

      if (currentMode === 'high') {
        minDifficulty = currentLevel - 1
        maxDifficulty = currentLevel + 1
      }

      // 1. 모드 필터
      let isCorrectGroup = false

      if (currentStage === 'E') {
        isCorrectGroup = item.level_group === 'E'
      }

      if (currentStage === 'M') {
        isCorrectGroup = item.level_group === 'M'
      }

      if (currentStage === 'H') {
        isCorrectGroup = item.level_group === 'H'
      }

      if (!isCorrectGroup) return false

      // 2. 난이도 필터
      return (
        Number(item.difficulty) >= minDifficulty &&
        Number(item.difficulty) <= maxDifficulty &&
        !usedSet.has(item.word)
      )
    })

    const fallbackWords = wordList.filter(item => {

      if (currentStage === 'E') {
        return item.level_group === 'E'
      }
      if (currentStage === 'M') {
        return item.level_group === 'M'
      }
      if (currentStage === 'H') {
        return item.level_group === 'H'
      }

    })

    let sourceWords = suitableWords

    if (sourceWords.length < 5) {
      sourceWords = fallbackWords.filter(item => {

        if (currentStage === 'E') return item.level_group === 'E'
        if (currentStage === 'M') return item.level_group === 'M'
        if (currentStage === 'H') return item.level_group === 'H'

      })
    }


    // 🔥 핵심 수정
    if (sourceWords.length === 0) {

      if (currentMode === 'high') {
        sourceWords = wordList.filter(w => w.level_group === 'H')
      }

      if (sourceWords.length === 0 && currentMode === 'high') {
        sourceWords = wordList.filter(w => w.level_group === 'M')
      }

      if (currentMode === 'middle') {
        sourceWords = wordList.filter(w => w.level_group === 'M')
      }

      if (sourceWords.length === 0 && currentMode === 'middle') {
        sourceWords = wordList.filter(w => w.level_group === 'E')
      }

      if (currentMode === 'elementary') {
        sourceWords = wordList.filter(w => w.level_group === 'E')
      }

    }

    if (sourceWords.length === 0) {
      console.log('단어 없음')
      return
    }

    const randomWord =
      sourceWords[
      Math.floor(Math.random() * sourceWords.length)
      ]

    const correctMeaning = randomWord.meaning

    let filteredWords = wordList.filter(item => {

      // 1. 정답 제외
      if (item.meaning === correctMeaning) return false

      // 2. 품사 동일
      if (item.pos !== randomWord.pos) return false

      // 🔥 3. 난이도 범위 추가 (핵심)
      const diffGap = Math.abs(
        Number(item.difficulty) - Number(randomWord.difficulty)
      )

      return diffGap <= 1.5   // ⭐ 핵심 값
    })

    // 부족하면 fallback
    if (filteredWords.length < 4) {
      filteredWords = wordList.filter(item =>
        item.meaning !== correctMeaning &&
        item.pos === randomWord.pos &&
        item.word !== randomWord.word
      )
    }

    filteredWords = filteredWords.filter(
      (item, index, self) =>
        index === self.findIndex(
          t => t.meaning === item.meaning
        )
    )

    let wrongChoices = filteredWords
      .sort(() => 0.5 - Math.random())
      .slice(0, 4)
      .map(item => item.meaning)

    let allChoices = [
      correctMeaning,
      ...wrongChoices
    ]

    allChoices = allChoices.sort(() => 0.5 - Math.random())

    setQuestion(randomWord)
    setChoices(allChoices)

    setUsedWords(prev => [
      ...prev,
      randomWord.word
    ])
  }

  function getMaxLevel() {

    if (testMode === 'elementary') {
      return 6
    }

    if (testMode === 'middle') {
      return 9
    }

    return 12
  }

  function startTest(mode, startLevel) {

    setTestMode(mode)
    setLevelScore(startLevel)

    // 🔥 여기 추가 (핵심)
    if (mode === 'elementary') {
      setCurrentStage('E')
    }
    else if (mode === 'middle') {
      setCurrentStage('M')
    }
    else if (mode === 'high') {
      setCurrentStage('H')
    }

    setCorrectCount(0)
    setWrongCount(0)
    setQuestionCount(0)

    setStreak(0)
    setWrongStreak(0)
    setUsedWords([])

    setIsFinished(false)

    setSelectedAnswer(null)
    setIsAnswerChecked(false)
  }

  function checkAnswer(choice) {

    if (isAnswerChecked) return  // 🔥 중복 클릭 방지

    setSelectedAnswer(choice)
    setIsAnswerChecked(true)

    const nextStreak = choice === question.meaning ? streak + 1 : 0
    const nextWrongStreak = choice !== question.meaning ? wrongStreak + 1 : 0

    setQuestionCount(prev => prev + 1)

    if (choice === question.meaning) {

      alert('정답!')

      const currentLevel = levelScore
      const diff =
        Number(question.difficulty) - currentLevel

      // 🔥 레벨에 따른 상승/하락 조정 (핵심)
      let weight = 1

      if (levelScore >= 9) {
        weight = 0.15   // 고등 → 많이 느리게
      }
      else if (levelScore >= 6) {
        weight = 0.3   // 중등 → 조금 느리게
      }

      const nextLevel =
        levelScore +
        (Number(question.difficulty) >= levelScore ? 0.25 : 0.2)

      setLevelScore(prev => {

        const diff = Number(question.difficulty) - prev

        let delta = 0

        if (diff >= 1) {
          delta = 0.4 * weight
        }
        else if (diff >= 0) {
          delta = 0.25 * weight
        }
        else {
          delta = 0.2 * weight   // 🔥 회복 강화
        }

        return Math.min(prev + delta, getMaxLevel())
      })

      setCorrectCount(prev => prev + 1)

      setStreak(prev => {
        // 🔥 6점 미만에서는 streak 무효
        if (currentStage === 'E' && levelScore < 6) return 0
        return prev + 1
      })

      setWrongStreak(0)



    } else {

      alert('오답!')

      setWrongWords(prev => [...prev, question])

      // 🔥 이거 추가 (핵심)
      let weight = 1

      if (levelScore >= 9) {
        weight = 0.2
      }

      else if (levelScore >= 6) {
        weight = 0.7
      }

      setLevelScore(prev => {

        const diff = Number(question.difficulty) - prev

        let delta = 0

        if (diff >= 1) {
          delta = -0.1 * weight
        }
        else if (diff >= 0) {
          delta = -0.3 * weight
        }
        else {
          delta = -0.5 * weight
        }

        return prev + delta
      })

      setWrongCount(prev => prev + 1)

      setWrongStreak(prev => prev + 1)

      setStreak(0)


      // 🔼 승급/강등 먼저 처리
    }

    // 🔽 종료 조건

    if (questionCount + 1 === 50) {
      setShowContinue(true)
      return
    }

    // 🔥 초등 → 중등
    if (
      currentStage === 'E' &&
      levelScore >= 5.8 &&
      nextStreak >= 5
    ) {
      alert('🎉 중등으로 승급!')
      setCurrentStage('M')
      setTestMode('middle')   // 🔥 꼭 있어야 함
      setLevelScore(6.5)

      setStreak(0)
      setWrongStreak(0)

      setQuestionCount(0)
      setCorrectCount(0)
      setWrongCount(0)
      setUsedWords([])

      setSelectedAnswer(null)
      setIsAnswerChecked(false)

      makeQuestion(words)

      return
    }

    // 🔥 중등 → 고등 (👉 여기 추가)
    if (
      currentStage === 'M' &&
      levelScore >= 8.8 &&
      nextStreak >= 5
    ) {
      alert('🔥 고등으로 승급!')
      setCurrentStage('H')
      setTestMode('high')   // 🔥 이거 중요
      setLevelScore(9.2)

      setStreak(0)
      setWrongStreak(0)

      setQuestionCount(0)
      setCorrectCount(0)
      setWrongCount(0)
      setUsedWords([])

      setSelectedAnswer(null)
      setIsAnswerChecked(false)
      makeQuestion(words)

      return
    }

    // 🔽 다음 문제

    setTimeout(() => {
      setSelectedAnswer(null)
      setIsAnswerChecked(false)
      makeQuestion(words)
    }, 800)

  }

  if (reviewMode) {

    if (wrongWords.length === 0) {
      return (
        <div>
          <h2>복습할 오답이 없습니다 👍</h2>
          <button onClick={() => setReviewMode(false)}>
            돌아가기
          </button>
        </div>
      )
    }

    const current = wrongWords[reviewIndex]

    return (
      <div>

        <h2>오답 복습</h2>

        <p>총 오답: {wrongWords.length}</p>
        <p>남은 단어: {wrongWords.length - reviewIndex}</p>

        <p><strong>{current.word}</strong></p>

        <p>정답: {current.meaning}</p>

        <br />

        <button onClick={() => {

          if (reviewIndex + 1 < wrongWords.length) {
            setReviewIndex(prev => prev + 1)
          } else {
            alert('복습 완료!')
            setReviewMode(false)
          }

        }}>
          다음
        </button>

        <br /><br />

        <button onClick={() => setReviewMode(false)}>
          종료
        </button>

      </div>
    )
  }


  if (!testMode) {

    return (

      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#f5f5f5'
      }}>

        <div style={{
          backgroundColor: 'white',
          padding: '30px',
          borderRadius: '12px',
          boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
          width: '400px',
          textAlign: 'center'
        }}>

          <h1 style={{
            fontSize: '28px',
            fontWeight: 'bold',
            lineHeight: '1.4',
            marginBottom: '25px'
          }}>
            영어 단어 실력 테스트
          </h1>

          <button
            onClick={() => startTest('elementary', 1.0)}
            style={btnStyle}
          >
            초등
          </button>

          <button
            onClick={() => startTest('middle', 6.0)}
            style={btnStyle}
          >
            중등
          </button>

          <button
            onClick={() => startTest('high', 9.0)}
            style={btnStyle}
          >
            고등
          </button>

          <br /><br />

          <button
            onClick={() => {
              setReviewMode(true)
              setReviewIndex(0)
            }}
            style={{
              ...btnStyle,
              backgroundColor: '#eee'
            }}
          >
            오답 복습
          </button>

        </div>

      </div>
    )
  }

  if (!question) {
    return <div>Loading...</div>
  }

  if (isFinished) {

    let levelText = ''

    const grade = Math.floor(levelScore + 0.000001)

    const decimal = levelScore - grade

    let subLevel = ''

    if (decimal <= 0.3) {
      subLevel = '초급'
    }
    else if (decimal <= 0.6) {
      subLevel = '중급'
    }
    else {
      subLevel = '고급'
    }

    if (levelScore <= 6) {

      levelText =
        `초등 ${grade}학년 ${subLevel}`

    }
    if (levelScore <= 6) {

      levelText =
        `초등 ${grade}학년 ${subLevel}`

    }
    else if (levelScore <= 9) {

      levelText =
        `중등 ${grade - 5}학년 ${subLevel}`

    }
    else {

      levelText =
        `고등 ${grade - 8}학년 ${subLevel}`

    }

    const accuracy =
      correctCount / (correctCount + wrongCount)

    const penalty = wrongCount * 0.03

    const finalScore =
      levelScore * (0.7 + 0.3 * accuracy) - penalty

    return (

      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#f5f5f5'
      }}>

        <div style={{
          backgroundColor: 'white',
          padding: '30px',
          borderRadius: '12px',
          boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
          width: '400px',
          textAlign: 'center'
        }}>

          <h1>테스트 완료!</h1>

          <h2>
            최종 단어 실력: {finalScore.toFixed(1)}
          </h2>

          <h3>{levelText}</h3>

          <p>정답: {correctCount}</p>
          <p>오답: {wrongCount}</p>

          <br />

          <button
            onClick={() => {
              setReviewMode(true)
              setReviewIndex(0)
            }}
            style={btnStyle}
          >
            오답 복습
          </button>

          <button
            onClick={() => {

              setTestMode(null)
              setIsFinished(false)

              setLevelScore(1.0)

              setCorrectCount(0)
              setWrongCount(0)
              setQuestionCount(0)

              setStreak(0)
              setWrongStreak(0)

              setUsedWords([])
              setWrongWords([])

            }}
            style={{
              ...btnStyle,
              backgroundColor: '#eee'
            }}
          >
            처음으로 돌아가기
          </button>

        </div>

      </div>
    )


  }

  return (

    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      backgroundColor: '#f5f5f5'
    }}>

      <div style={{
        backgroundColor: 'white',
        padding: '30px',
        borderRadius: '12px',
        boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
        width: '400px',
        textAlign: 'center'
      }}>

        <h2 style={{ marginBottom: '10px' }}>
          Vocabulary Test
        </h2>

        <p style={{ margin: '5px 0' }}>
          점수: {levelScore.toFixed(1)}
        </p>

        <p style={{ margin: '5px 0' }}>
          정답: {correctCount} / 오답: {wrongCount}
        </p>

        <p style={{ margin: '5px 0' }}>
          진행: {questionCount}문제 (추가 학습 중)
        </p>

        <p style={{ marginBottom: '20px' }}>
          연속 정답: {streak}
        </p>

        <h1 style={{
          marginBottom: '20px',
          fontSize: '28px'
        }}>
          {question.word}
        </h1>

        {choices.map((choice, index) => (

          <button
            key={index}
            onClick={() => checkAnswer(choice)}
            style={{
              display: 'block',
              width: '100%',
              marginBottom: '10px',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid #ddd',
              cursor: 'pointer',
              fontSize: '14px',

              backgroundColor:
                isAnswerChecked
                  ? choice === question.meaning
                    ? '#4caf50'   // 정답 (초록)
                    : choice === selectedAnswer
                      ? '#f44336'   // 내가 고른 오답 (빨강)
                      : '#eee'
                  : '#fafafa'
            }}
          >
            {choice}
          </button>

        ))}

        <br />

        {showContinue && (
          <div style={{
            marginTop: '20px',
            padding: '15px',
            borderRadius: '10px',
            backgroundColor: '#fff3cd'
          }}>
            <p>50문제를 완료했습니다!</p>

            <button
              onClick={() => {
                setShowContinue(false)
                makeQuestion(words)
              }}
              style={{ marginRight: '10px' }}
            >
              계속 풀기
            </button>

            <button
              onClick={() => setIsFinished(true)}
            >
              결과 보기
            </button>
          </div>
        )}

        <button
          onClick={() => {

            const ok = window.confirm(
              '지금까지의 결과를 확인하시겠습니까?'
            )

            if (ok) {
              setIsFinished(true)
            }

          }}
          style={{
            marginTop: '10px',
            padding: '10px',
            width: '100%',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: '#ddd',
            cursor: 'pointer'
          }}
        >
          테스트 종료
        </button>

      </div>

    </div>

  )


}



export default App