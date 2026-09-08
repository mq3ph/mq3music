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

  let pendingEmail = '';
  let currentAccount = null;


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

    const promo = Number(account.credits?.promo || 0);
    const purchased = Number(account.credits?.purchased || 0);
    const total = Number(
      account.credits?.total ?? (promo + purchased)
    );

    creditBalance.textContent = total.toLocaleString();

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
     START
  ========================================================= */

  loadAccount();

})();
