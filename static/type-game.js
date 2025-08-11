$(function () {
  const missCountMax = 5; //漏掉最大个数
  const spawnIntervalDefault = 1 * 1000; //字符生成速度
  const fallSpeedDefault = 3 * 1000; //掉落速度
  const scorePerLevelUp = 30; // 每多少分升级难度
  // --- 状态变量 ---
  let score = 0;
  let missCount = 0;
  let highScore = parseInt(localStorage.getItem("highScore") || "0");
  let recentScores = JSON.parse(localStorage.getItem("recentScores") || "[]");
  let level = 1;
  let spawnInterval = spawnIntervalDefault;
  let fallSpeed = fallSpeedDefault;
  let gameInterval = null;
  let isGameOver = false;
  let isPaused = false;

  $("#highScore").text(highScore);
  $("#max-miss").text(missCountMax);
  $(".upgrade-score").text(scorePerLevelUp);

  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const bgm = document.getElementById("bgm");
  const explodeSound = document.getElementById("explodeSound");

  function blockFinishCallback() {
    $(this).remove();
    if (!isPaused && !isGameOver) {
      missCount++;
      $("#miss").text(missCount);
      if (missCount >= missCountMax && !isGameOver) {
        isGameOver = true;
        endGame();
      }
    }
  }

  function animateToBottom($el, duration) {
    const bottom = $(window).height();
    $el.data("startTime", Date.now());
    $el.data("duration", duration);
    $el.animate(
      { top: bottom + "px" },
      duration,
      "linear",
      blockFinishCallback
    );
  }

  function createLetterBlock() {
    if (isPaused || isGameOver) return;
    let letter = letters.charAt(Math.floor(Math.random() * letters.length));
    let leftPos =
      window.innerWidth * 0.1 + Math.random() * (window.innerWidth * 0.8 - 50);
    let $block = $('<div class="letter-block animate__animated"></div>');
    $block.text(letter);
    $block.css({ left: leftPos + "px", top: "-60px" });
    $("body").append($block);
    animateToBottom($block, fallSpeed);
  }

  function createExplosion(x, y, color) {
    for (let i = 0; i < 12; i++) {
      let $p = $('<div class="particle"></div>');
      $p.css({ left: x + "px", top: y + "px", background: color });
      $("body").append($p);
      let angle = Math.random() * 2 * Math.PI;
      let distance = 50 + Math.random() * 50;
      let targetX = x + Math.cos(angle) * distance;
      let targetY = y + Math.sin(angle) * distance;
      $p.animate(
        { left: targetX + "px", top: targetY + "px", opacity: 0 },
        500,
        function () {
          $(this).remove();
        }
      );
    }
  }

  // 键盘事件
  $(document).on("keydown", function (e) {
    if (isGameOver) return;

    if (e.code === "Space") {
      if (!isPaused) {
        pauseGame();
        $("#pauseBtn").text("继续");
      } else {
        resumeGame();
        $("#pauseBtn").text("暂停");
      }
    } else {
      if (isPaused) return;
      let keyPressed = e.key.toUpperCase();
      $(".letter-block").each(function () {
        if ($(this).text() === keyPressed) {
          let $el = $(this);
          let pos = $el.position();
          let centerX = pos.left + $el.width() / 2;
          let centerY = pos.top + $el.height() / 2;
          $el.stop(true, false);
          createExplosion(centerX, centerY, "#ff6b6b");
          $el.remove();
          explodeSound.currentTime = 0;
          explodeSound.play();

          score++;
          $("#score").text(score);

          // 每50分升级一次
          if (score % scorePerLevelUp === 0) {
            levelUp();
          }
        }
      });
    }
  });

  $("#startBtn").on("click", startCountdown);
  $("#restartBtn").on("click", function () {
    $("#endScreen").hide();
    startCountdown();
  });

  $("#pauseBtn").on("click", function () {
    if (isGameOver) return;
    if (!isPaused) {
      pauseGame();
      $(this).text("继续");
    } else {
      resumeGame();
      $(this).text("暂停");
    }
  });

  function startCountdown() {
    score = 0;
    missCount = 0;
    level = 1;
    spawnInterval = spawnIntervalDefault;
    fallSpeed = fallSpeedDefault;
    isGameOver = false;
    isPaused = false;
    $("#pauseBtn").text("暂停");
    $("#score").text(score);
    $("#miss").text(missCount);
    $("#level").text(level);
    $(".letter-block, .particle").remove();

    let countdownNum = 3;
    $("#countdown").text(countdownNum);
    $("#startScreen").show();
    $("#endScreen").hide();

    let countdownTimer = setInterval(function () {
      countdownNum--;
      if (countdownNum > 0) {
        $("#countdown").text(countdownNum);
      } else {
        clearInterval(countdownTimer);
        $("#startScreen").fadeOut();
        bgm.currentTime = 0;
        bgm.play();
        startGame();
      }
    }, 1000);
  }

  function startGame() {
    if (gameInterval) clearInterval(gameInterval);
    gameInterval = setInterval(createLetterBlock, spawnInterval);
  }

  function levelUp() {
    if (spawnInterval > 300) spawnInterval -= 50;
    if (fallSpeed > 1000) fallSpeed -= 300;
    level++;
    $("#level").text(level);
    clearInterval(gameInterval);
    gameInterval = setInterval(createLetterBlock, spawnInterval);
  }

  function pauseGame() {
    if (isPaused) return;
    isPaused = true;
    clearInterval(gameInterval);
    bgm.pause();
    $(".letter-block").each(function () {
      const $b = $(this);
      const start = $b.data("startTime");
      const duration = $b.data("duration");
      let remaining = 0;
      if (typeof start === "number" && typeof duration === "number") {
        const elapsed = Date.now() - start;
        remaining = Math.max(0, Math.ceil(duration - elapsed));
      }
      $b.stop(true, false);
      $b.data("remaining", remaining);
    });
  }

  function resumeGame() {
    if (!isPaused) return;
    isPaused = false;
    bgm.play();
    $(".letter-block").each(function () {
      const $b = $(this);
      let remaining = $b.data("remaining");
      if (!remaining || remaining <= 0) {
        const bottom = $(window).height();
        $b.animate({ top: bottom + "px" }, 30, "linear", blockFinishCallback);
      } else {
        animateToBottom($b, remaining);
        $b.removeData("remaining");
      }
    });
    gameInterval = setInterval(createLetterBlock, spawnInterval);
  }

  function getCurrentTimeString() {
    let now = new Date();
    let y = now.getFullYear();
    let m = String(now.getMonth() + 1).padStart(2, "0");
    let d = String(now.getDate()).padStart(2, "0");
    let hh = String(now.getHours()).padStart(2, "0");
    let mm = String(now.getMinutes()).padStart(2, "0");
    let ss = String(now.getSeconds()).padStart(2, "0");
    return `${y}-${m}-${d} ${hh}:${mm}:${ss}`;
  }

  function endGame() {
    clearInterval(gameInterval);
    bgm.pause();
    $(".letter-block, .particle").remove();

    if (score > highScore) {
      highScore = score;
      localStorage.setItem("highScore", highScore);
    }
    $("#highScore").text(highScore);

    const currentRecord = { score: score, time: getCurrentTimeString() };
    recentScores.unshift(currentRecord);
    if (recentScores.length > 5) recentScores = recentScores.slice(0, 5);
    localStorage.setItem("recentScores", JSON.stringify(recentScores));

    $("#recentScoresList").empty();
    recentScores.forEach((item, i) => {
      $("#recentScoresList").append(`
        <li>
          <span class="rank-score">第 ${i + 1} 局: ${item.score} 分</span><br>
          <span class="rank-time">${item.time}</span>
        </li>
      `);
    });

    $("#finalScore").text(score);
    $("#finalHighScore").text(highScore);
    $("#endScreen").fadeIn();
  }
});
