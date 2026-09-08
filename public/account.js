(() => {
  'use strict';

  const $ = id => document.getElementById(id);

  const dialog = $('account-dialog');
  const accountButton = $('account-button');

  const emailForm = $('account-email-form');
  const codeForm = $('account-code-form');
  const accountPanel = $('account-panel');

  const emailInput = $('account-email');
  const emailMessage = $('account-email-message');

  const codeEmail = $('account-code-email');
  const codeInput = $('account-code');
  const codeMessage = $('account-code-message');

  const welcome = $('account-welcome');
  const userEmail = $('account-user-email');
  const creditBalance = $('account-credit-balance');
  const welcomeBonus = $('account-welcome-bonus');

  const profileForm = $('account-profile-form');
  const displayNameInput = $('account-display-name');
  const profileMessage = $('account-profile-message');

  let pendingEmail = '';
  let currentAccount = null;

  const giftMeta = {
    heart: {emoji: '❤️', name: 'Heart'},
    rose: {emoji: '🌹', name: 'Rose'},
    star: {emoji: '⭐', name: 'Star'},
    music_note: {emoji: '🎵', name: 'Music Note'},
    crown: {emoji: '👑', name: 'Crown'},
    shoutout: {emoji: '📣', name: 'Shout-out'}
  };


  /* =========================================================
     HELPERS
  ========================================================= */

  function show(element) {
    element?.classList.remove('hidden');
  }

  function hide(element) {
    element?.classList.add('hidden');
  }

  function setMessage(element, message, isError = false) {
    if (!element) return;

    element.textContent = message || '';
    element.style.color = isError ? '#ff9b9b' : '';
  }

  async function api(url, options = {}) {
    const response = await fetch(url, {
      credentials: 'same-origin',
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    });

    let data = {};

    try {
      data = await response.json();
    } catch {
      data = {};
    }

    if (!response.ok) {
      throw new Error(
        data.error ||
        data.message ||
        'Something went wrong. Please try again.'
      );
    }

    return data;
  }

  function resetViews() {
    show(emailForm);
    hide(codeForm);
    hide(accountPanel);

    setMessage(emailMessage, '');
    setMessage(codeMessage, '');

    codeInput.value = '';
  }


  /* =========================================================
     GIFT HISTORY DISPLAY
  ========================================================= */

  function ensureGiftHistory() {
    let section = $('account-gift-history');

    if (section) return section;

    section = document.createElement('section');
    section.id = 'account-gift-history';
    section.style.marginTop = '18px';
    section.style.paddingTop = '16px';
    section.style.borderTop = '1px solid rgba(212,175,55,.28)';

    const heading = document.createElement('div');
    heading.style.display = 'flex';
    heading.style.justifyContent = 'space-between';
    heading.style.alignItems = 'center';
    heading.style.gap = '12px';
    heading.style.marginBottom = '10px';

    const title = document.createElement('strong');
    title.textContent = '🎁 Recent Gifts';

    const lifetime = document.createElement('span');
    lifetime.id = 'account-lifetime-gifted';
    lifetime.style.fontSize = '.9rem';
    lifetime.style.opacity = '.86';

    const list = document.createElement('div');
    list.id = 'account-gift-list';

    heading.append(title, lifetime);
    section.append(heading, list);

    const doneButton = $('account-done');
    if (doneButton && doneButton.parentNode === accountPanel) {
      accountPanel.insertBefore(section, doneButton);
    } else {
      accountPanel.append(section);
    }

    return section;
  }

  function displayGiftHistory(account) {
    const section = ensureGiftHistory();
    const lifetime = $('account-lifetime-gifted');
    const list = $('account-gift-list');

    const lifetimeGifted =
      Number(account.lifetimeGifted || 0);

    lifetime.textContent =
      `${lifetimeGifted.toLocaleString()} lifetime ${
        lifetimeGifted === 1
          ? 'Credit'
          : 'Credits'
      }`;

    const gifts =
      Array.isArray(account.giftHistory)
        ? account.giftHistory
        : [];

    list.replaceChildren();

    if (!gifts.length) {
      const empty = document.createElement('div');
      empty.textContent =
        'No gifts sent yet. Support a song you love with your first gift. ❤️';
      empty.style.opacity = '.78';
      empty.style.fontSize = '.92rem';
      empty.style.lineHeight = '1.45';
      list.append(empty);
      return;
    }

    for (const gift of gifts) {
      const meta =
        giftMeta[gift.type] ||
        {emoji: '🎁', name: 'Gift'};

      const item = document.createElement('div');
      item.style.padding = '10px 0';
      item.style.borderBottom =
        '1px solid rgba(255,255,255,.08)';

      const top = document.createElement('div');
      top.style.display = 'flex';
      top.style.justifyContent = 'space-between';
      top.style.gap = '12px';

      const label = document.createElement('strong');
      label.textContent =
        `${meta.emoji} ${meta.name}`;

      const credits = document.createElement('span');
      const amount = Number(gift.credits || 0);
      credits.textContent =
        `${amount.toLocaleString()} ${amount === 1 ? 'Credit' : 'Credits'}`;

      const song = document.createElement('div');
      song.textContent = gift.songTitle || 'MQ3 Song';
      song.style.marginTop = '3px';
      song.style.fontSize = '.92rem';
      song.style.opacity = '.86';

      const date = document.createElement('div');
      date.style.marginTop = '3px';
      date.style.fontSize = '.8rem';
      date.style.opacity = '.62';

      const parsedDate = new Date(gift.createdAt);
      date.textContent =
        Number.isNaN(parsedDate.getTime())
          ? ''
          : parsedDate.toLocaleString();

      top.append(label, credits);
      item.append(top, song);

      if (date.textContent) {
        item.append(date);
      }

      list.append(item);
    }

    show(section);
  }


  /* =========================================================
     SUPPORTER RANK
  ========================================================= */

  async function displaySupporterRank(account) {
    let rankBox = $('account-supporter-rank');

    if (!rankBox) {
      rankBox = document.createElement('div');
      rankBox.id = 'account-supporter-rank';
      rankBox.style.margin = '14px 0';
      rankBox.style.padding = '12px 14px';
      rankBox.style.border = '1px solid rgba(212,175,55,.28)';
      rankBox.style.borderRadius = '12px';
      rankBox.style.textAlign = 'center';

      const profile =
        $('account-profile-form');

      if (
        profile &&
        profile.parentNode === accountPanel
      ) {
        profile.insertAdjacentElement(
          'afterend',
          rankBox
        );
      } else {
        accountPanel.prepend(rankBox);
      }
    }

    const displayName =
      account.displayName?.trim() || '';

    const lifetimeGifted =
      Number(account.lifetimeGifted || 0);

    if (!displayName || lifetimeGifted <= 0) {
      rankBox.textContent =
        '🏆 Send gifts to join the Top Supporters leaderboard.';
      rankBox.style.opacity = '.78';
      show(rankBox);
      return;
    }

    rankBox.textContent =
      '🏆 Checking your Supporter Rank…';
    rankBox.style.opacity = '.86';
    show(rankBox);

    try {
      const data =
        await api('/api/gifts/leaderboard');

      const supporters =
        Array.isArray(data.supporters)
          ? data.supporters
          : [];

      const match =
        supporters.find(
          supporter =>
            supporter.displayName === displayName &&
            Number(supporter.lifetimeGifted || 0) === lifetimeGifted
        ) ||
        supporters.find(
          supporter =>
            supporter.displayName === displayName
        );

      if (match) {
        const rank = Number(match.rank || 0);

        rankBox.textContent =
          `🏆 Supporter Rank: #${rank} · ` +
          `${lifetimeGifted.toLocaleString()} lifetime ${
            lifetimeGifted === 1
              ? 'Credit'
              : 'Credits'
          } gifted`;

        rankBox.style.opacity = '1';
      } else {
        rankBox.textContent =
          '🏆 You are supporting MQ3! Keep gifting to reach the Top 25.';
        rankBox.style.opacity = '.82';
      }

    } catch (error) {
      console.error(
        'MQ3 supporter rank failed:',
        error
      );

      rankBox.textContent =
        '🏆 Supporter Rank is temporarily unavailable.';
      rankBox.style.opacity = '.78';
    }
  }


  /* =========================================================
     LOAD CREDITS
  ========================================================= */

  const creditPackages = {
    50: 50,
    100: 105,
    250: 275,
    500: 575,
    1000: 1200
  };

  function ensureCreditLoadDialog() {
    let loadDialog = $('mq3-credit-load-dialog');

    if (loadDialog) return loadDialog;

    loadDialog = document.createElement('dialog');
    loadDialog.id = 'mq3-credit-load-dialog';

    loadDialog.innerHTML = `
      <form id="mq3-credit-load-form">
        <div class="eyebrow">MQ3 LOAD CREDITS</div>
        <h2 style="margin-bottom:6px;">🪙 Complete Credit Load</h2>

        <p id="mq3-credit-load-package"
           style="margin-top:0;font-weight:700;"></p>

        <label>
          Payment method
          <select id="mq3-credit-load-provider" required>
            <option value="gcash">GCash</option>
            <option value="paypal">PayPal</option>
          </select>
        </label>

        <label>
          Payment reference
          <input
            id="mq3-credit-load-reference"
            type="text"
            maxlength="100"
            autocomplete="off"
            placeholder="Enter transaction/reference number"
            required
          >
        </label>

        <p style="font-size:.88rem;opacity:.76;line-height:1.45;">
          Submit the reference only after making your payment.
          Your Credits will remain pending until MQ3 verifies the payment.
        </p>

        <p
          id="mq3-credit-load-message"
          role="status"
        ></p>

        <div class="actions">
          <button
            type="button"
            class="button"
            id="mq3-credit-load-cancel"
          >
            Cancel
          </button>

          <button
            type="submit"
            class="button primary"
            id="mq3-credit-load-submit"
          >
            Submit for Verification
          </button>
        </div>
      </form>
    `;

    document.body.append(loadDialog);

    $('mq3-credit-load-cancel')
      ?.addEventListener('click', () => {
        loadDialog.close();
      });

    $('mq3-credit-load-form')
      ?.addEventListener('submit', submitCreditLoad);

    return loadDialog;
  }

  let selectedCreditAmount = 0;

  function openCreditLoad(amountPesos) {
    const credits = creditPackages[amountPesos];

    if (!currentAccount) {
      alert('Sign in to your MQ3 account first.');
      return;
    }

    if (!credits) {
      alert('Choose a valid MQ3 Credit package.');
      return;
    }

    selectedCreditAmount = amountPesos;

    const loadDialog = ensureCreditLoadDialog();
    const packageText = $('mq3-credit-load-package');
    const reference = $('mq3-credit-load-reference');
    const provider = $('mq3-credit-load-provider');
    const message = $('mq3-credit-load-message');

    packageText.textContent =
      `₱${amountPesos.toLocaleString()} → 🪙 ${credits.toLocaleString()} Credits`;

    reference.value = '';
    provider.value = 'gcash';
    setMessage(message, '');

    loadDialog.showModal();
    reference.focus();
  }

  function activateCreditPackages() {
    const buttons =
      document.querySelectorAll('.mq3-credit-package');

    for (const button of buttons) {
      const amountPesos =
        Number(button.dataset.pesos || 0);

      button.disabled = false;
      button.style.cursor = 'pointer';

      if (button.dataset.mq3LoadReady === 'true') {
        continue;
      }

      button.dataset.mq3LoadReady = 'true';

      button.addEventListener('click', () => {
        openCreditLoad(amountPesos);
      });
    }
  }

  async function submitCreditLoad(event) {
    event.preventDefault();

    const amountPesos = selectedCreditAmount;
    const credits = creditPackages[amountPesos];

    const provider = $('mq3-credit-load-provider');
    const reference = $('mq3-credit-load-reference');
    const message = $('mq3-credit-load-message');
    const button = $('mq3-credit-load-submit');

    const paymentProvider =
      provider?.value || '';

    const paymentReference =
      reference?.value.trim() || '';

    if (!credits) {
      setMessage(
        message,
        'Choose a valid MQ3 Credit package.',
        true
      );
      return;
    }

    if (!paymentReference) {
      setMessage(
        message,
        'Enter your payment reference.',
        true
      );
      reference?.focus();
      return;
    }

    button.disabled = true;
    button.textContent = 'Submitting…';

    setMessage(
      message,
      'Submitting your payment for MQ3 verification…'
    );

    try {
      const data = await api(
        '/api/account/credit-load',
        {
          method: 'POST',
          body: JSON.stringify({
            amountPesos,
            paymentProvider,
            paymentReference
          })
        }
      );

      if (data.account) {
        displayAccount(data.account);
      } else {
        await loadAccount();
      }

      setMessage(
        message,
        data.message ||
        'Payment submitted for MQ3 verification. ✓'
      );

      reference.value = '';

      setTimeout(() => {
        $('mq3-credit-load-dialog')?.close();
      }, 1200);

    } catch (error) {
      setMessage(
        message,
        error.message,
        true
      );

    } finally {
      button.disabled = false;
      button.textContent = 'Submit for Verification';
    }
  }


  /* =========================================================
     ACCOUNT DISPLAY
  ========================================================= */

  function displayAccount(account) {
    currentAccount = account;

    hide(emailForm);
    hide(codeForm);
    show(accountPanel);

    const displayName =
      account.displayName && account.displayName.trim()
        ? account.displayName.trim()
        : '';

    welcome.textContent =
      displayName
        ? `Welcome, ${displayName}!`
        : 'Welcome to MQ3!';

    userEmail.textContent = account.email || '';

    if (displayNameInput) {
      displayNameInput.value = displayName;
    }

    setMessage(profileMessage, '');

    const promo = Number(account.credits?.promo || 0);
    const purchased = Number(account.credits?.purchased || 0);
    const total = Number(
      account.credits?.total ?? (promo + purchased)
    );

    creditBalance.textContent = total.toLocaleString();

    displayGiftHistory(account);
    displaySupporterRank(account);
    activateCreditPackages();

    if (promo > 0) {
      welcomeBonus.textContent =
        `🎁 Your Welcome Credits are ready! ` +
        `You have ${promo.toLocaleString()} promo Credits. ` +
        `Send your first gift to a song you love. ❤️`;

      show(welcomeBonus);
    } else {
      welcomeBonus.textContent =
        '❤️ Load Credits to keep supporting the music you love.';

      show(welcomeBonus);
    }

    accountButton.textContent =
      `🪙 ${total.toLocaleString()} Credits`;
  }


  /* =========================================================
     CHECK CURRENT SESSION
  ========================================================= */

  async function loadAccount() {
    try {
      const data = await api('/api/account');

      if (data.signedIn && data.account) {
        displayAccount(data.account);
        return;
      }

      currentAccount = null;
      accountButton.textContent = '👤 Sign In';

    } catch (error) {
      console.error('MQ3 account check failed:', error);

      currentAccount = null;
      accountButton.textContent = '👤 Sign In';
    }
  }


  /* =========================================================
     OPEN ACCOUNT
  ========================================================= */

  accountButton.addEventListener('click', async () => {
    if (currentAccount) {
      displayAccount(currentAccount);
    } else {
      resetViews();
    }

    dialog.showModal();
  });


  /* =========================================================
     CLOSE
  ========================================================= */

  $('account-close').addEventListener('click', () => {
    dialog.close();
  });

  $('account-done').addEventListener('click', () => {
    dialog.close();
  });


  /* =========================================================
     SEND OTP
  ========================================================= */

  emailForm.addEventListener('submit', async event => {
    event.preventDefault();

    const address = emailInput.value.trim();

    if (!address) {
      setMessage(
        emailMessage,
        'Enter your email address.',
        true
      );
      return;
    }

    const button = $('account-send-code');

    button.disabled = true;
    button.textContent = 'Sending…';

    setMessage(
      emailMessage,
      'Sending your MQ3 sign-in code…'
    );

    try {
      const data = await api(
        '/api/account/request-code',
        {
          method: 'POST',
          body: JSON.stringify({
            email: address
          })
        }
      );

      pendingEmail = address;

      codeEmail.textContent = address;

      hide(emailForm);
      show(codeForm);

      setMessage(
        codeMessage,
        data.message ||
        'Check your email for your 6-digit code.'
      );

      codeInput.focus();

    } catch (error) {
      setMessage(
        emailMessage,
        error.message,
        true
      );

    } finally {
      button.disabled = false;
      button.textContent = 'Send Code';
    }
  });


  /* =========================================================
     BACK TO EMAIL
  ========================================================= */

  $('account-back').addEventListener('click', () => {
    hide(codeForm);
    show(emailForm);

    codeInput.value = '';

    setMessage(codeMessage, '');
    setMessage(emailMessage, '');

    emailInput.focus();
  });


  /* =========================================================
     VERIFY OTP
  ========================================================= */

  codeForm.addEventListener('submit', async event => {
    event.preventDefault();

    const code = codeInput.value.trim();

    if (!/^\d{6}$/.test(code)) {
      setMessage(
        codeMessage,
        'Enter the 6-digit code from your email.',
        true
      );
      return;
    }

    if (!pendingEmail) {
      setMessage(
        codeMessage,
        'Please request a new sign-in code.',
        true
      );
      return;
    }

    const button = $('account-verify');

    button.disabled = true;
    button.textContent = 'Signing In…';

    setMessage(
      codeMessage,
      'Checking your code…'
    );

    try {
      const data = await api(
        '/api/account/verify-code',
        {
          method: 'POST',
          body: JSON.stringify({
            email: pendingEmail,
            code
          })
        }
      );

      if (!data.account) {
        throw new Error(
          'Signed in, but account information was not returned.'
        );
      }

      displayAccount(data.account);

      pendingEmail = '';
      codeInput.value = '';

    } catch (error) {
      setMessage(
        codeMessage,
        error.message,
        true
      );

    } finally {
      button.disabled = false;
      button.textContent = 'Sign In';
    }
  });


  /* =========================================================
     ONLY NUMBERS IN OTP FIELD
  ========================================================= */

  codeInput.addEventListener('input', () => {
    codeInput.value =
      codeInput.value
        .replace(/\D/g, '')
        .slice(0, 6);
  });


  /* =========================================================
     SAVE DISPLAY NAME
  ========================================================= */

  profileForm?.addEventListener('submit', async event => {
    event.preventDefault();

    const displayName =
      displayNameInput?.value.trim() || '';

    if (!displayName) {
      setMessage(
        profileMessage,
        'Enter the display name you want other listeners to see.',
        true
      );
      displayNameInput?.focus();
      return;
    }

    const button = $('account-save-profile');

    button.disabled = true;
    button.textContent = 'Saving…';

    setMessage(
      profileMessage,
      'Saving your display name…'
    );

    try {
      const data = await api(
        '/api/account/profile',
        {
          method: 'POST',
          body: JSON.stringify({
            displayName
          })
        }
      );

      if (!data.account) {
        throw new Error(
          'Display name was saved, but account information was not returned.'
        );
      }

      displayAccount(data.account);

      setMessage(
        profileMessage,
        'Display name saved. ✓'
      );

    } catch (error) {
      setMessage(
        profileMessage,
        error.message,
        true
      );

    } finally {
      button.disabled = false;
      button.textContent = 'Save Display Name';
    }
  });


  /* =========================================================
     LOG OUT
  ========================================================= */

  $('account-logout').addEventListener('click', async () => {
    const button = $('account-logout');

    button.disabled = true;
    button.textContent = 'Signing Out…';

    try {
      await api(
        '/api/account/logout',
        {
          method: 'POST',
          body: JSON.stringify({})
        }
      );

      currentAccount = null;
      pendingEmail = '';

      emailInput.value = '';
      codeInput.value = '';

      accountButton.textContent = '👤 Sign In';

      dialog.close();

    } catch (error) {
      alert(error.message);

    } finally {
      button.disabled = false;
      button.textContent = 'Sign Out';
    }
  });


  /* =========================================================
     WALLET / GIFT REFRESH
  ========================================================= */

  window.addEventListener('mq3-wallet-updated', () => {
    loadAccount();
  });


  /* =========================================================
     START
  ========================================================= */

  loadAccount();

})();
