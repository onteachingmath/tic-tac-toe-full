// game.js

document.addEventListener('DOMContentLoaded', () => {

  const screenMode = document.getElementById('screenMode');
  const screenSubject = document.getElementById('screenSubject');
  const screenTopic = document.getElementById('screenTopic');
  const screenGame = document.getElementById('screenGame');
  const subjectButtons = document.getElementById('subjectButtons');
  const topicButtons = document.getElementById('topicButtons');
  const selectedSubjectLabel = document.getElementById('selectedSubjectLabel');
  const gameBoard = document.getElementById('gameBoard');
  const questionPanel = document.getElementById('questionPanel');
  const questionText = document.getElementById('questionText');
  const questionImage = document.getElementById('questionImage');
  const answerChoices = document.getElementById('answerChoices');
  const hintButton = document.getElementById('hintButton');
  const hintSection = document.getElementById('hintSection');
  const gameFeedback = document.getElementById('gameFeedback');
  const gameInfo = document.getElementById('gameInfo');
  const restartBtn = document.getElementById('restartBtn');
  const newTopicBtn = document.getElementById('newTopicBtn');
  const gameControls = document.getElementById('gameControls');
  const downloadPdfBtn = document.getElementById('downloadPdfBtn');

  let fullQuestionBank = [];
  let mode = null;
  let subject = null;
  let topic = null;
  let questions = [];
  let currentQuestion = null;
  let currentCell = null;
  let currentCellIndex = null;
  let playerTurn = 'X';
  let board = ["", "", "", "", "", "", "", "", ""];
  let hintsUsed = 0;
  let scores = { X: 0, O: 0, TIE: 0 };
  let gameLog = [];

  function latexToPlainText(latex) {
    return latex
      .replace(/\\frac{([^}]+)}{([^}]+)}/g, '($1/$2)')   // Convert \frac{a}{b} to (a/b)
      .replace(/\\pi/g, 'π')                             // Replace \pi with π
      .replace(/\\theta/g, 'θ')                          // Replace \theta with θ
      .replace(/\\sin/g, 'sin')                          // Replace \sin with sin
      .replace(/\\cos/g, 'cos')                          // Replace \cos with cos
      .replace(/\\tan/g, 'tan')                          // Replace \tan with tan
      .replace(/\\left|\\right|\\ /g, '')                // Remove \left, \right, and escaped spaces
      .replace(/[{}]/g, '')                              // Remove all curly braces
      .replace(/\\\\/g, '')                              // Remove double backslashes
      .replace(/\$/g, '')                                // Remove dollar signs (if any)
      .trim();
  }
  
  function updateScoreboard() {
    document.getElementById('xScore').textContent = scores.X;
    document.getElementById('oScore').textContent = scores.O;
    document.getElementById('tieScore').textContent = scores.TIE;
  }

  function showScreen(screen) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    screen.classList.add('active');
  }

  screenMode.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      mode = btn.dataset.mode;
      showScreen(screenSubject);
    });
  });

  const subjects = [
    "Math Facts", "Algebra 1", "Algebra 2", "Geometry",
    "Trigonometry", "Calculus", "Statistics", "Probability", "ACT Prep"
  ];

  subjects.forEach(subj => {
    const btn = document.createElement('button');
    btn.textContent = subj;
    btn.addEventListener('click', () => {
      subject = subj;
      selectedSubjectLabel.textContent = subject;
      loadTopics(subject);
      showScreen(screenTopic);
    });
    subjectButtons.appendChild(btn);
  });

  function loadTopics(subject) {
    topicButtons.innerHTML = '';
    const topics = [...new Set(fullQuestionBank
      .filter(q => q.subject === subject)
      .map(q => q.topic))];
    topics.forEach(top => {
      const btn = document.createElement('button');
      btn.textContent = top;
      btn.addEventListener('click', () => {
        topic = top;
        startGame();
      });
      topicButtons.appendChild(btn);
    });
  }

  function startGame() {
    const filtered = fullQuestionBank.filter(q => q.subject === subject && q.topic === topic);

    const uniqueMap = new Map();
    filtered.forEach(q => {
      const baseText = q.question_latex.includes("(variant")
  ? q.question_latex.split(" (variant")[0].trim()
  : q.question_latex;

      if (!uniqueMap.has(baseText)) {
        uniqueMap.set(baseText, q);
      }
    });

    questions = Array.from(uniqueMap.values());
    if (questions.length < 9) {
      alert("Not enough questions to start a game. Minimum is 9.");
      return;
    }

    board = ["", "", "", "", "", "", "", "", ""];
    gameLog = [];
    createBoard();
    showScreen(screenGame);
    document.getElementById('scoreWrapper').classList.remove('hidden');
    gameControls.classList.remove('hidden');
    gameFeedback.innerHTML = '';
    hintsUsed = 0;
    playerTurn = 'X';
    gameInfo.textContent = `Subject: ${subject}  |  Topic: ${topic}  |  Player: ${playerTurn}`;
  }

  function createBoard() {
    gameBoard.innerHTML = '';
    for (let i = 0; i < 9; i++) {
      const cell = document.createElement('div');
      cell.classList.add('cell');
      cell.dataset.index = i;
      cell.addEventListener('click', () => handleCellClick(cell));
      gameBoard.appendChild(cell);
    }
  }

  function handleCellClick(cell) {
    // Prevent clicking on already answered cells unless it was incorrectly answered
    if (cell.classList.contains('answered') && !cell.classList.contains('incorrect')) return;

    currentCell = cell;
    currentCellIndex = parseInt(cell.dataset.index);

    // Reuse stored question if incorrect, otherwise get a new one
    if (cell.classList.contains('incorrect')) {
      currentQuestion = JSON.parse(cell.dataset.question);
    } else {
      currentQuestion = getRandomQuestion();
    }

    displayQuestion(currentQuestion);
    questionPanel.classList.remove('hidden');
    currentCell.style.backgroundColor = '#d3d3d3'; // Grey for selected
    currentCell.textContent = ''; // No X or O yet
  }

  function getRandomQuestion() {
    const index = Math.floor(Math.random() * questions.length);
    return questions.splice(index, 1)[0];
  }

  function displayQuestion(q) {
    questionText.innerHTML = q.question_latex;
    hintSection.innerHTML = '';
    questionImage.classList.add('hidden');
    if (q.image) {
      questionImage.src = q.image;
      questionImage.classList.remove('hidden');
    }
    answerChoices.innerHTML = '';

    const answers = shuffleArray([q.correct_answer, ...q.incorrect_answers]);
    answers.forEach(ans => {
      const btn = document.createElement('button');
    
      btn.innerHTML = `\\(${ans}\\)`;         // show LaTeX like \frac{4}{5}
      renderMathInElement(btn);              // render it cleanly
      btn.dataset.rawAnswer = ans;           // save the original LaTeX text
      btn.classList.add('answer-option');
      btn.style.transition = 'background-color 0.2s';
    
      btn.addEventListener('click', () => {
        document.querySelectorAll('.answer-option').forEach(b => {
          b.classList.remove('selected');
          b.style.backgroundColor = '';
        });
        btn.classList.add('selected');
        btn.style.backgroundColor = '#cce5ff';
    
        currentCell.dataset.answer = btn.dataset.rawAnswer; // use raw string for checking
      });
    
      answerChoices.appendChild(btn);
    });
    
    renderMathInElement(questionText);
    setupSubmitListener();
  }

  function checkWin() {
    const winPatterns = [
      [0,1,2], [3,4,5], [6,7,8],
      [0,3,6], [1,4,7], [2,5,8],
      [0,4,8], [2,4,6]
    ];

    for (let pattern of winPatterns) {
      const [a, b, c] = pattern;
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return board[a];
      }
    }

    return board.includes("") ? null : "TIE";
  }

  function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function setupSubmitListener() {
    const original = document.getElementById('submitAnswer');
    const clone = original.cloneNode(true);
    original.parentNode.replaceChild(clone, original);
  
    clone.addEventListener('click', () => {
      const chosen = currentCell.dataset.answer;
      const correct = currentQuestion.correct_answer;
      const match = chosen && (chosen.replace(/\s+/g, '').toLowerCase() === correct.replace(/\s+/g, '').toLowerCase());
  
      // Default: don't place a mark yet
      let markPlaced = false;
  
      // 1-PLAYER LOGIC
      if (mode === '1p') {
        const mark = match ? 'X' : 'O';
        board[currentCellIndex] = mark;
        currentCell.textContent = mark;
        currentCell.classList.add('answered');
        currentCell.style.backgroundColor = match ? '#c8f7c5' : '#f7c5c5';
        markPlaced = true;
      }
  
      // 2-PLAYER LOGIC
      else if (mode === '2p') {
        if (match) {
          currentCell.classList.add('answered');
          currentCell.style.backgroundColor = '#c8f7c5'; // Green for correct
          currentCell.textContent = playerTurn; // Assign X or O
          board[currentCellIndex] = playerTurn; // Update board
        } else {
          currentCell.style.backgroundColor = '#ffffff'; // Reset to white
          currentCell.textContent = ''; // Clear content
          currentCell.classList.remove('answered'); // Ensure selectable
          currentCell.classList.add('incorrect'); // Mark as incorrect
          currentCell.dataset.question = JSON.stringify(currentQuestion); // Store question
        }
        
        // ✅ Always switch players after each 2p turn
        playerTurn = playerTurn === 'X' ? 'O' : 'X';
        
        gameInfo.textContent = `Subject: ${subject}  |  Topic: ${topic}  |  Player: ${playerTurn}`;
      }
  
      // Shared logging
      gameLog.push({
        question: currentQuestion.question_latex,
        correct: currentQuestion.correct_answer,
        chosen,
        explanation: currentQuestion.explanation,
        image: currentQuestion.image || ""
      });
      
      // Feedback
      gameFeedback.innerHTML = match
        ? `✅ Player ${mode === '2p' ? (playerTurn === 'X' ? 'O' : 'X') : 'X'} is correct!`
        : `❌ Incorrect. Correct answer: ${correct}<br>${currentQuestion.explanation}<br><em>Keep going — you're learning!</em>`;
      renderMathInElement(gameFeedback);
      questionPanel.classList.add('hidden');
  
      // Win check only if a mark was placed
      const winner = checkWin();
      if (winner) {
        scores[winner]++;
        updateScoreboard();
        gameFeedback.innerHTML =
          winner === 'X'
            ? "🎉 Player X wins! Well done!"
            : winner === 'O'
            ? mode === '2p'
              ? "🎉 Player O wins! Great job!"
              : "💥 Computer (O) wins! Better luck next time!<br><strong>Smack talk:</strong> 'Was that your best move? 😎'"
            : "🤝 It's a tie! Good game!";
        renderMathInElement(gameFeedback);
        document.querySelectorAll('.cell').forEach(cell => cell.classList.add('answered'));
        return;
      }
    });
  }

  hintButton.addEventListener('click', () => {
    if (hintsUsed >= 2) {
      hintSection.innerHTML = '<em>You have used all your hints!</em>';
      return;
    }
    hintSection.innerHTML = `<strong>Hint:</strong> ${currentQuestion.hint}`;
    renderMathInElement(hintSection);
    hintsUsed++;
  });

  restartBtn.addEventListener('click', () => {
    startGame();
  });

  newTopicBtn.addEventListener('click', () => {
    showScreen(screenSubject);
    gameBoard.innerHTML = '';
    questionPanel.classList.add('hidden');
    gameFeedback.innerHTML = '';
    gameControls.classList.add('hidden');
  });

  downloadPdfBtn.addEventListener('click', () => {
    const printWindow = window.open('', '_blank');

    let questionsHtml = gameLog.map((entry, index) => {
      const plainQ = latexToPlainText(entry.question);
      const plainChosen = latexToPlainText(entry.chosen || '');
      const plainCorrect = latexToPlainText(entry.correct || '');
      const plainExplanation = latexToPlainText(entry.explanation || '');
      const imageHtml = entry.image ? `<img src="${entry.image}" style="max-width: 100%; margin: 10px 0;">` : '';
    
      return `
        <div class="question-block">
          <p><strong>Q${index + 1}:</strong> ${plainQ}</p>
          ${imageHtml}
          <p><strong>Your Answer:</strong> ${plainChosen}</p>
          <p><strong>Correct Answer:</strong> ${plainCorrect}</p>
          <p><em>${plainExplanation}</em></p>
          <hr>
        </div>
      `;
    }).join('');
    
    
    printWindow.document.write(`
      <html>
      <head>
        <title>Tic Tac Toe Game Report</title>
        <style>
          body { font-family: Georgia, serif; padding: 20px; }
          h2 { text-align: center; }
          .question-block { margin-bottom: 20px; }
          hr { border: 0; border-top: 1px solid #ccc; }
        </style>
      </head>
      <body>
        <h2>Tic Tac Toe Game Report</h2>
        <p><strong>Subject:</strong> ${subject}</p>
        <p><strong>Topic:</strong> ${topic}</p>
        <p><strong>Final Score:</strong></p>
        <ul>
          <li>X: ${scores.X}</li>
          <li>O: ${scores.O}</li>
          <li>Cat (Tie): ${scores.TIE}</li>
        </ul>
        <h3>Answered Questions</h3>
        ${questionsHtml}
        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `);

    printWindow.document.close();
  });

  fetch('questions.json')
    .then(res => res.json())
    .then(data => {
      fullQuestionBank = data;
      showScreen(screenMode);
    })
    .catch(err => console.error("Failed to load questions", err));

});
