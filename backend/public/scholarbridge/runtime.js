/* global document, window, fetch, alert */
(function () {
  "use strict";

  var authRole = "student";
  var authMode = "login";
  var authSignupStep = "details";
  var pendingSignup = null;
  var authBusy = false;
  var authResendBusy = false;
  var resendCountdown = 0;
  var resendTimer = null;
  var user = null;
  var skills = [];
  var selectedSlug = null;
  var skillDetail = null;
  var conversationId = null;
  var chatSkillId = null;
  var appsStore = [];

  function escapeHtml(s) {
    if (s == null) return "";
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function initialsFromRawName(name) {
    if (!name) return "?";
    var parts = name
      .replace(/^Prof\.|^Dr\.|^Mr\.|^Ms\.|^Mrs\./gi, "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (parts.length === 0) return "?";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  async function fetchJSON(url, opts) {
    opts = opts || {};
    var headers = Object.assign({}, opts.headers || {});
    if (opts.body && !headers["Content-Type"])
      headers["Content-Type"] = "application/json";
    var res = await fetch(url, Object.assign({ credentials: "include" }, opts, { headers: headers }));
    var text = await res.text();
    var data = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch (_) {
      data = {};
    }
    if (!res.ok) {
      var err = new Error(data.error || res.statusText || "Request failed");
      err.status = res.status;
      throw err;
    }
    return data;
  }

  function show(p) {
    document.querySelectorAll(".page").forEach(function (x) {
      x.classList.remove("active");
    });
    var el = document.getElementById(p);
    if (el) {
      el.classList.add("active");
      el.scrollTop = 0;
    }
    if (p === "browse") void refreshBrowse();
    if (p === "profile") void refreshProfilePage();
    if (p === "chat") void refreshChatPage();
    if (p === "applications") void refreshApplicationsPage();
    if (p === "dashboard") void refreshDashboardPage();
    if (p === "auth") syncBrowseSignButton();
  }
  window.show = show;

  function authEl(id) {
    return document.getElementById(id);
  }

  function authRoleValue() {
    return authRole === "mentor" ? "MENTOR" : "STUDENT";
  }

  function clearAuthStatus() {
    var box = authEl("authStatus");
    if (!box) return;
    box.style.display = "none";
    box.className = "auth-status";
    box.textContent = "";
  }

  function setAuthStatus(message, type) {
    var box = authEl("authStatus");
    if (!box) return;
    box.className = "auth-status " + (type || "info");
    box.textContent = message;
    box.style.display = "block";
  }

  function stopAuthCountdown() {
    if (resendTimer) {
      window.clearInterval(resendTimer);
      resendTimer = null;
    }
    resendCountdown = 0;
  }

  function updateAuthResendButton() {
    var btn = authEl("authResendBtn");
    if (!btn) return;
    btn.disabled = !pendingSignup || authResendBusy || resendCountdown > 0 || authBusy;
    if (authResendBusy) {
      btn.textContent = "Sending...";
      return;
    }
    btn.textContent = resendCountdown > 0 ? "Resend (" + resendCountdown + "s)" : "Resend";
  }

  function startAuthCountdown(seconds) {
    stopAuthCountdown();
    resendCountdown = seconds;
    updateAuthResendButton();
    resendTimer = window.setInterval(function () {
      resendCountdown -= 1;
      if (resendCountdown <= 0) {
        stopAuthCountdown();
      }
      updateAuthResendButton();
    }, 1000);
  }

  function resetSignupFlow() {
    authSignupStep = "details";
    pendingSignup = null;
    stopAuthCountdown();
    var codeInput = authEl("authCode");
    if (codeInput) codeInput.value = "";
  }

  function collectSignupDraft() {
    return {
      email: authEl("authEmail").value.trim(),
      password: authEl("authPassword").value,
      confirm: authEl("authConfirm").value,
      displayName: authEl("authName").value.trim(),
      institution: authEl("authInstitution").value.trim(),
      role: authRoleValue(),
    };
  }

  function validateSignupDraft(draft) {
    if (!draft.displayName) return "Please enter your name.";
    if (!draft.email) return "Please enter your email.";
    if (!draft.password || draft.password.length < 6) {
      return "Password must be at least 6 characters.";
    }
    if (draft.password !== draft.confirm) return "Passwords do not match.";
    if (draft.role === "MENTOR" && !draft.institution) {
      return "Please enter your institution.";
    }
    return "";
  }

  function renderAuthState() {
    var isSignup = authMode === "signup";
    var isVerify = isSignup && authSignupStep === "verify";
    var nameField = authEl("nameField");
    var institutionField = authEl("institutionField");
    var passwordField = authEl("passwordField");
    var confirmField = authEl("confirmField");
    var codeField = authEl("codeField");
    var summary = authEl("authSummary");
    var emailInput = authEl("authEmail");
    var passwordInput = authEl("authPassword");
    var submitBtn = authEl("authSubmit");
    var backBtn = authEl("authBackBtn");
    var divider = authEl("authDivider");
    var oauthButtons = authEl("authOauthButtons");
    var footer = authEl("authFooter");
    var footerText = authEl("authFooterText");
    var footerLink = authEl("authFooterLink");

    if (nameField) nameField.style.display = isSignup && !isVerify ? "block" : "none";
    if (institutionField) {
      institutionField.style.display = isSignup && !isVerify && authRole === "mentor" ? "block" : "none";
    }
    if (passwordField) passwordField.style.display = isVerify ? "none" : "block";
    if (confirmField) confirmField.style.display = isSignup && !isVerify ? "block" : "none";
    if (codeField) codeField.style.display = isVerify ? "block" : "none";
    if (summary) {
      summary.style.display = isVerify ? "block" : "none";
      summary.textContent = isVerify && pendingSignup
        ? "We sent a verification code to " + pendingSignup.email + " for your " +
          (pendingSignup.role === "MENTOR" ? "mentor" : "student") + " account."
        : "";
    }

    if (emailInput) {
      emailInput.readOnly = isVerify;
      emailInput.style.background = isVerify ? "var(--bg-alt)" : "";
    }
    if (passwordInput) passwordInput.required = !isVerify;
    if (authEl("authConfirm")) authEl("authConfirm").required = isSignup && !isVerify;
    if (authEl("authName")) authEl("authName").required = isSignup && !isVerify;
    if (authEl("authInstitution")) {
      authEl("authInstitution").required = isSignup && !isVerify && authRole === "mentor";
    }
    if (authEl("authCode")) authEl("authCode").required = isVerify;

    document.querySelectorAll("#auth .role-btn").forEach(function (btn) {
      btn.style.pointerEvents = isVerify ? "none" : "";
      btn.style.opacity = isVerify ? "0.7" : "1";
    });

    if (submitBtn) {
      submitBtn.disabled = authBusy;
      if (authBusy) {
        if (authMode === "login") submitBtn.textContent = "Signing In...";
        else if (isVerify) submitBtn.textContent = "Verifying...";
        else submitBtn.textContent = "Sending...";
      } else if (authMode === "login") {
        submitBtn.textContent = "Sign In";
      } else if (isVerify) {
        submitBtn.textContent = "Verify & Create Account";
      } else {
        submitBtn.textContent = "Send Verification Code";
      }
    }

    if (backBtn) {
      backBtn.style.display = isVerify ? "block" : "none";
      backBtn.disabled = authBusy;
    }
    if (divider) divider.style.display = isVerify ? "none" : "flex";
    if (oauthButtons) oauthButtons.style.display = isVerify ? "none" : "flex";
    if (footer) footer.style.display = isVerify ? "none" : "block";
    if (footerText) {
      footerText.textContent = authMode === "login"
        ? "Don't have an account?"
        : "Already have an account?";
    }
    if (footerLink) {
      footerLink.textContent = authMode === "login" ? "Create one" : "Sign in";
      footerLink.onclick = function (e) {
        e.preventDefault();
        window.setAuthModeFromFooter(authMode === "login" ? "signup" : "login");
      };
    }

    updateAuthResendButton();
  }

  window.setAuthRole = function (role, el) {
    var wasVerify = authMode === "signup" && authSignupStep === "verify";
    authRole = role;
    document.querySelectorAll("#auth .role-btn").forEach(function (b) {
      b.classList.remove("active");
    });
    if (el) el.classList.add("active");
    if (wasVerify) {
      resetSignupFlow();
      setAuthStatus("Role changed. Please request a new verification code.", "info");
    }
    renderAuthState();
  };

  window.setAuthMode = function (mode, el) {
    authMode = mode;
    document.querySelectorAll("#auth .form-tab").forEach(function (t) {
      t.classList.remove("active");
    });
    if (el) el.classList.add("active");
    clearAuthStatus();
    resetSignupFlow();
    renderAuthState();
  };

  window.setAuthModeFromFooter = function (targetMode) {
    var tab =
      targetMode === "signup"
        ? document.querySelector("#auth .form-tab:nth-child(2)")
        : document.querySelector("#auth .form-tab:nth-child(1)");
    if (tab) window.setAuthMode(targetMode, tab);
  };

  window.backToSignupDetails = function () {
    resetSignupFlow();
    clearAuthStatus();
    renderAuthState();
  };

  window.resendAuthCode = async function () {
    if (!pendingSignup) {
      setAuthStatus("Please fill in your registration details first.", "error");
      return;
    }
    clearAuthStatus();
    authResendBusy = true;
    updateAuthResendButton();
    try {
      var data = await fetchJSON("/api/auth/send-code", {
        method: "POST",
        body: JSON.stringify({
          email: pendingSignup.email,
          role: pendingSignup.role,
        }),
      });
      startAuthCountdown(60);
      setAuthStatus(data.message || "Verification code resent.", "success");
    } catch (err) {
      setAuthStatus(err.message || "Failed to resend code.", "error");
    } finally {
      authResendBusy = false;
      updateAuthResendButton();
    }
  };

  window.handleAuth = async function (e) {
    e.preventDefault();
    clearAuthStatus();
    var email = authEl("authEmail").value.trim();
    var password = authEl("authPassword").value;
    try {
      if (authMode === "signup") {
        if (authSignupStep === "verify") {
          if (!pendingSignup) {
            resetSignupFlow();
            setAuthStatus("Please enter your details and request a new code.", "error");
            renderAuthState();
            return;
          }

          var code = authEl("authCode").value.trim();
          if (!/^\d{6}$/.test(code)) {
            setAuthStatus("Please enter the 6-digit verification code.", "error");
            return;
          }

          authBusy = true;
          renderAuthState();
          await fetchJSON("/api/auth/verify-email", {
            method: "POST",
            body: JSON.stringify({
              email: pendingSignup.email,
              code: code,
              role: pendingSignup.role,
              password: pendingSignup.password,
              displayName: pendingSignup.displayName,
              institution: pendingSignup.role === "MENTOR" ? pendingSignup.institution : undefined,
            }),
          });
          setAuthStatus("Account created successfully.", "success");
        } else {
          var draft = collectSignupDraft();
          var validationError = validateSignupDraft(draft);
          if (validationError) {
            setAuthStatus(validationError, "error");
            return;
          }

          authBusy = true;
          renderAuthState();
          var sendResult = await fetchJSON("/api/auth/send-code", {
            method: "POST",
            body: JSON.stringify({
              email: draft.email,
              role: draft.role,
            }),
          });
          pendingSignup = {
            email: draft.email,
            password: draft.password,
            displayName: draft.displayName,
            institution: draft.institution,
            role: draft.role,
          };
          authSignupStep = "verify";
          startAuthCountdown(60);
          setAuthStatus(sendResult.message || "Verification code sent. Check your inbox.", "success");
          renderAuthState();
          authEl("authCode").focus();
          return;
        }
      } else {
        if (!email || !password) {
          setAuthStatus("Please enter your email and password.", "error");
          return;
        }
        authBusy = true;
        renderAuthState();
        await fetchJSON("/api/auth/login", {
          method: "POST",
          body: JSON.stringify({ email: email, password: password }),
        });
        setAuthStatus("Welcome back!", "success");
      }
      await refreshMe();
      if (user && user.role === "MENTOR") show("dashboard");
      else show("browse");
    } catch (err) {
      setAuthStatus(err.message || "Auth failed", "error");
    } finally {
      authBusy = false;
      renderAuthState();
    }
  };

  window.handleOAuth = function (provider) {
    alert(
      "Demo: " +
        (provider === "scholar" ? "Google Scholar" : "ORCID") +
        " is not connected. Use email or demo accounts (see readme).",
    );
  };

  function agentLabel() {
    var n = skillDetail && skillDetail.mentor && skillDetail.mentor.displayName;
    return n ? "Agent · " + escapeHtml(n) : "Agent";
  }

  window.addMsg = function (role, text) {
    var msgs = document.getElementById("msgs");
    var typing = document.getElementById("typing-indicator");
    if (role === "agent") typing.style.display = "none";
    var d = document.createElement("div");
    d.className = "msg msg-" + role;
    var label =
      role === "user" ? "You" : agentLabel();
    d.innerHTML =
      '<div class="msg-label">' +
      label +
      '</div><div class="msg-bubble">' +
      escapeHtml(text).replace(/\n/g, "<br>") +
      "</div>";
    msgs.insertBefore(d, typing);
    msgs.scrollTop = msgs.scrollHeight;
  };

  window.sendMsg = async function () {
    var inp = document.getElementById("chatInput");
    var v = inp.value.trim();
    if (!v) return;
    if (!conversationId) {
      alert("No active conversation. Open chat from a mentor card.");
      return;
    }
    window.addMsg("user", v);
    inp.value = "";
    var typing = document.getElementById("typing-indicator");
    typing.style.display = "block";
    document.getElementById("msgs").scrollTop = 99999;
    try {
      var data = await fetchJSON("/api/chat", {
        method: "POST",
        body: JSON.stringify({ conversationId: conversationId, content: v }),
      });
      window.addMsg("agent", data.message || "(empty)");
    } catch (e) {
      typing.style.display = "none";
      alert(e.message);
    }
  };

  window.handleKey = function (e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      window.sendMsg();
    }
  };

  window.showAppTab = function (tab, el) {
    document.querySelectorAll(".app-tab").forEach(function (t) {
      t.classList.remove("active");
    });
    if (el) el.classList.add("active");
    var appContent = document.getElementById("appContent");
    var convContent = document.getElementById("convContent");
    if (tab === "conversations") {
      appContent.style.display = "none";
      convContent.style.display = "flex";
      renderConvList();
    } else {
      appContent.style.display = "flex";
      convContent.style.display = "none";
      if (tab === "pending") renderAppListFiltered(true);
      else renderAppList(appsStore);
    }
  };

  window.showDashTab = function (tab, el) {
    document.querySelectorAll(".dash-nav-item").forEach(function (n) {
      n.classList.remove("on");
    });
    if (el) el.classList.add("on");
    document.querySelectorAll(".dash-tab-content").forEach(function (c) {
      c.classList.remove("active");
    });
    var pane = document.getElementById("dash-" + tab);
    if (pane) pane.classList.add("active");
  };

  window.sbLogout = async function () {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    user = null;
    show("landing");
  };

  async function refreshMe() {
    try {
      var data = await fetchJSON("/api/me");
      user = data.user;
    } catch (_) {
      user = null;
    }
    syncBrowseSignButton();
  }

  function syncBrowseSignButton() {
    var btn = document.querySelector("#browse .nav-btn.primary");
    if (!btn) return;
    if (user) {
      btn.textContent = "Sign Out";
      btn.onclick = function () {
        window.sbLogout();
      };
    } else {
      btn.textContent = "Sign In";
      btn.onclick = function () {
        show("auth");
      };
    }
  }

  async function refreshBrowse() {
    try {
      var data = await fetchJSON("/api/skills");
      skills = data.skills || [];
    } catch (_) {
      skills = [];
    }
    var grid = document.getElementById("sb-mentor-grid");
    if (!grid) return;
    if (skills.length === 0) {
      grid.innerHTML =
        '<p style="grid-column:1/-1;padding:40px;text-align:center;color:var(--text-light)">No published mentors yet. Run <code>npm run db:seed</code>.</p>';
      return;
    }
    grid.innerHTML = skills.map(renderMentorCard).join("");
  }

  function renderMentorCard(s) {
    var m = s.mentor || {};
    var rawName = m.displayName || s.mentorName || "Mentor";
    var name = escapeHtml(rawName);
    var inst = escapeHtml(m.institution || s.institution || "");
    var initials = escapeHtml(m.initials || initialsFromRawName(rawName));
    var tags = s.tags || [];
    var tagHtml = tags
      .slice(0, 3)
      .map(function (t) {
        return '<span class="tag">' + escapeHtml(t) + "</span>";
      })
      .join("");
    var active = s.agent && s.agent.active;
    var badgeClass = active ? "badge-green" : "badge-blue";
    var dot = active ? '<span class="dot dot-green"></span>' : "";
    var badgeText = active ? "Agent Active" : "Agent Learning";
    var openN = s.openPositionsCount != null ? s.openPositionsCount : 0;
    var hline = s.hIndex != null ? "h-index " + s.hIndex : "";
    var slug = escapeHtml(s.slug);
    return (
      '<div class="mentor-card" data-slug="' +
      slug +
      '">' +
      '<div class="mentor-card-top">' +
      '<div class="avatar" style="width:50px;height:50px;font-size:16px">' +
      initials +
      "</div>" +
      '<div class="mentor-info"><h4>' +
      name +
      "</h4><p>" +
      inst +
      '</p><div style="margin-top:6px"><span class="badge ' +
      badgeClass +
      '">' +
      dot +
      badgeText +
      "</span></div></div></div>" +
      '<div class="mentor-tags">' +
      tagHtml +
      "</div>" +
      '<div class="mentor-meta">' +
      '<div class="stat-pill">' +
      openN +
      ' open positions</div>' +
      '<div class="stat-pill">' +
      escapeHtml(hline) +
      '</div><button type="button" class="btn-ghost" data-chat-slug="' +
      slug +
      '">Chat Agent →</button></div></div>'
    );
  }

  async function loadSkillDetail(slug) {
    var data = await fetchJSON("/api/skills/" + encodeURIComponent(slug));
    skillDetail = data.skill;
    return skillDetail;
  }

  async function refreshProfilePage() {
    if (!selectedSlug) return;
    try {
      await loadSkillDetail(selectedSlug);
    } catch (e) {
      alert(e.message);
      return;
    }
    var d = skillDetail;
    var m = d.mentor || {};
    var rawName = m.displayName || "Mentor";
    var initials = escapeHtml(m.initials || initialsFromRawName(rawName));
    var subParts = [m.title, m.institution, m.location, "Connected via Google Scholar"].filter(Boolean);
    var tags = (d.tags || [])
      .map(function (t) {
        return '<span class="tag">' + escapeHtml(t) + "</span>";
      })
      .join("");
    var pubs = (d.publications || [])
      .map(function (p) {
        return (
          "<li><strong>" +
          escapeHtml(p.title) +
          "</strong> " +
          escapeHtml(p.detail || "") +
          "</li>"
        );
      })
      .join("");
    var openProjects = (d.projects || []).filter(function (p) {
      return p.status === "OPEN";
    });
    var closedProjects = (d.projects || []).filter(function (p) {
      return p.status === "CLOSED";
    });
    function projBlock(p) {
      var meta = (p.metaTags || [])
        .map(function (t) {
          return '<span class="tag">' + escapeHtml(t) + "</span>";
        })
        .join("");
      var badge =
        p.status === "OPEN"
          ? '<span class="badge badge-green">Open</span>'
          : '<span class="badge badge-red">Closed</span>';
      return (
        '<div class="project-item">' +
        '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">' +
        "<h5>" +
        escapeHtml(p.title) +
        "</h5>" +
        badge +
        "</div><p>" +
        escapeHtml(p.description) +
        '</p><div style="display:flex;gap:7px;flex-wrap:wrap;margin-bottom:12px">' +
        meta +
        '</div><button type="button" class="btn btn-outline" style="font-size:12px;padding:7px 15px" data-open-chat="1">Ask Agent about this role →</button></div>'
      );
    }
    var projHtml = openProjects.map(projBlock).join("") + closedProjects.map(projBlock).join("");
    var pubCount =
      Array.isArray(d.publications) && d.publications.length
        ? d.publications.length
        : "—";
    var summary =
      d.researchSummary ||
      "Research themes are distilled from the mentor profile and publications.";
    var slotsLeft = String(openProjects.length);

    var content = document.querySelector("#profile .content");
    if (!content) return;
    content.innerHTML =
      '<div class="profile-hero"><div class="profile-top">' +
      '<div class="avatar" style="width:85px;height:85px;font-size:28px;border:2px solid rgba(44,95,124,0.15)">' +
      initials +
      "</div>" +
      '<div class="profile-main">' +
      (d.agentActive
        ? '<div class="agent-pill" style="margin-bottom:10px"><span class="dot dot-green" style="margin-right:5px"></span> Agent Online — responds instantly</div>'
        : '<div class="agent-pill" style="margin-bottom:10px"><span class="dot dot-gold" style="margin-right:5px"></span> Agent status: check back soon</div>') +
      "<h2>" +
      escapeHtml(rawName) +
      "</h2>" +
      '<p class="profile-sub">' +
      escapeHtml(subParts.join(" · ")) +
      "</p>" +
      '<div class="profile-pills">' +
      tags +
      "</div>" +
      '<p style="font-size:14px;color:var(--text-light);line-height:1.75;max-width:620px">' +
      escapeHtml(m.bioShort || "") +
      "</p></div>" +
      "<div>" +
      '<div class="stats-row" style="grid-template-columns:1fr 1fr 1fr;min-width:240px">' +
      '<div class="stat-box"><div class="val">' +
      (d.hIndex != null ? escapeHtml(String(d.hIndex)) : "—") +
      '</div><div class="k">h-index</div></div>' +
      '<div class="stat-box"><div class="val">' +
      escapeHtml(d.citationsDisplay || "—") +
      '</div><div class="k">Citations</div></div>' +
      '<div class="stat-box"><div class="val">' +
      escapeHtml(String(openProjects.length)) +
      '</div><div class="k">Open Roles</div></div></div>' +
      '<button type="button" class="btn btn-gold" style="width:100%;margin-top:12px" data-open-chat="1">Chat with AI Agent →</button>' +
      "</div></div></div>" +
      '<div class="profile-body"><div>' +
      '<div class="section-title">Open Positions</div>' +
      (projHtml || '<p style="color:var(--text-light)">No positions listed.</p>') +
      '<hr><div class="section-title">Selected Publications</div><ul class="publications">' +
      (pubs || "") +
      "</ul></div><div>" +
      '<div class="section-title">Research Interests</div>' +
      '<div class="card" style="margin-bottom:20px"><p style="font-size:14px;color:var(--text-light);line-height:1.75"><em style="color:var(--accent);font-weight:600">Auto-analyzed from ' +
      escapeHtml(String(pubCount)) +
      ' publications</em><br><br>' +
      escapeHtml(summary) +
      "</p></div>" +
      '<div class="section-title" style="font-size:16px">Agent Availability</div>' +
      '<div class="card"><p style="font-size:13px;color:var(--text-light);margin-bottom:12px">' +
      escapeHtml(rawName) +
      "'s agent can answer questions about research fit and openings.</p>" +
      '<div style="font-size:13px;color:var(--text);line-height:1.9">' +
      "<div>⚡ Avg. agent response: <strong style=\"color:var(--text)\">as configured</strong></div>" +
      "<div>👀 Applications: <strong style=\"color:var(--text)\">mentor review</strong></div>" +
      '<div>📋 Open roles: <strong style="color:#2D7A4F">' +
      escapeHtml(slotsLeft) +
      "</strong></div></div>" +
      '<button type="button" class="btn btn-gold" style="width:100%;margin-top:16px" data-open-chat="1">Start Conversation</button></div></div></div>';

    content.querySelectorAll("[data-open-chat]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        void startChatWithSlug(selectedSlug);
      });
    });
    var chatNav = document.querySelector("#profile .nav-btn.primary");
    if (chatNav)
      chatNav.onclick = function () {
        void startChatWithSlug(selectedSlug);
      };
  }

  async function startChatWithSlug(slug) {
    if (!user || user.role !== "STUDENT") {
      alert("Please sign in as a student to chat with an agent.");
      show("auth");
      return;
    }
    var sk = skills.find(function (x) {
      return x.slug === slug;
    });
    if (!sk) {
      try {
        await refreshBrowse();
        sk = skills.find(function (x) {
          return x.slug === slug;
        });
      } catch (_) {}
    }
    if (!sk) {
      alert("Skill not found.");
      return;
    }
    selectedSlug = slug;
    try {
      await loadSkillDetail(slug);
      var res = await fetchJSON("/api/applications", {
        method: "POST",
        body: JSON.stringify({ skillId: sk.id }),
      });
      conversationId = res.conversationId;
      chatSkillId = sk.id;
      show("chat");
      await refreshChatPage();
    } catch (e) {
      alert(e.message);
    }
  }

  async function refreshChatPage() {
    if (!skillDetail) {
      if (selectedSlug) await loadSkillDetail(selectedSlug);
    }
    var d = skillDetail;
    var m = d && d.mentor;
    var rawName = (m && m.displayName) || "Mentor";
    var shortName = rawName.replace(/^Prof\.\s*|^Dr\.\s*/i, "").split(" ").pop() || rawName;
    var backBtn = document.querySelector("#chat nav .nav-btn");
    if (backBtn) backBtn.textContent = "← " + shortName;

    var h3 = document.querySelector("#chat .chat-header h3");
    if (h3) h3.textContent = "Agent · " + rawName;

    var avs = document.querySelectorAll("#chat .avatar");
    if (avs[0] && m && m.initials)
      avs[0].textContent = m.initials;
    if (avs[1] && m && m.initials)
      avs[1].textContent = m.initials;

    var agentBanner = document.querySelector("#chat .agent-banner .agent-name");
    if (agentBanner) agentBanner.textContent = "🤖 Agent · " + rawName;
    var agentP = document.querySelector("#chat .agent-banner p");
    if (agentP)
      agentP.textContent =
        d.agentIntro ||
        "Ask about research fit, openings, and how to apply. Replies use the mentor’s published profile.";

    var openProj = document.querySelector("#chat .open-proj");
    if (openProj && d.projects) {
      var open = d.projects.filter(function (p) {
        return p.status === "OPEN";
      });
      var closed = d.projects.filter(function (p) {
        return p.status === "CLOSED";
      });
      var h = "<h5>Open Positions</h5>";
      open.forEach(function (p) {
        var line = (p.metaTags || []).join(" · ");
        h +=
          '<div class="proj-item"><h6>' +
          escapeHtml(p.title) +
          "</h6><p>" +
          escapeHtml(line) +
          "</p></div>";
      });
      closed.forEach(function (p) {
        var line = (p.metaTags || []).join(" · ");
        h +=
          '<div class="proj-item" style="opacity:0.5"><h6>' +
          escapeHtml(p.title) +
          "</h6><p>" +
          escapeHtml(line || "Closed") +
          "</p></div>";
      });
      openProj.innerHTML = h;
    }

    var msgs = document.getElementById("msgs");
    var typing = document.getElementById("typing-indicator");
    if (!conversationId || !msgs) return;
    typing.style.display = "none";
    try {
      var conv = await fetchJSON("/api/conversations/" + encodeURIComponent(conversationId));
      var list = conv.messages || [];
      var canChat = !!(conv.conversation && conv.conversation.canChat);
      var input = document.getElementById("chatInput");
      var sendBtn = document.querySelector("#chat .send-btn");
      if (input) {
        input.disabled = !canChat;
        input.placeholder = canChat
          ? "Ask about research interests, positions, requirements..."
          : "Read-only: mentor view or conversation closed.";
      }
      if (sendBtn) sendBtn.disabled = !canChat;
      Array.from(msgs.children).forEach(function (child) {
        if (child.id !== "typing-indicator") msgs.removeChild(child);
      });
      list.forEach(function (msg) {
        if (msg.role === "USER") window.addMsg("user", msg.content);
        else if (msg.role === "ASSISTANT") window.addMsg("agent", msg.content);
      });
    } catch (e) {
      console.warn(e);
    }
  }

  function fmtDate(iso) {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch (_) {
      return "—";
    }
  }

  function appBadgeClass(status) {
    if (status === "REJECTED") return "badge-red";
    if (status === "ACCEPTED" || status === "INTERVIEW_SCHEDULED") return "badge-gold";
    return "badge-green";
  }

  function renderAppList(list) {
    var el = document.getElementById("appContent");
    if (!el) return;
    if (!list.length) {
      el.innerHTML =
        '<p style="padding:24px;color:var(--text-light)">No applications yet. Browse mentors and start a chat.</p>';
      return;
    }
    el.innerHTML = list
      .map(function (a) {
        var badge =
          '<span class="badge ' +
          appBadgeClass(a.status) +
          '">' +
          escapeHtml(a.statusLabelEn || a.status) +
          "</span>";
        var score =
          a.matchScorePercent != null
            ? '<span>⭐ Agent Score: ' + a.matchScorePercent + "/100</span>"
            : "";
        var applied = '<span>📅 Applied: ' + fmtDate(a.createdAt || a.lastMessageAt) + "</span>";
        var extra =
          a.interviewAt && a.status === "INTERVIEW_SCHEDULED"
            ? '<span>📅 Interview: ' + fmtDate(a.interviewAt) + "</span>"
            : '<span>💬 Conversation</span>';
        return (
          '<div class="app-card" data-app-conv="' +
          escapeHtml(a.conversationId || "") +
          '" data-skill-slug="' +
          escapeHtml(a.skill && a.skill.slug ? a.skill.slug : "") +
          '">' +
          '<div class="app-card-header"><div><h4>' +
          escapeHtml((a.skill && a.skill.title) || "—") +
          "</h4><p>" +
          escapeHtml(a.mentorName || "") +
          " · " +
          escapeHtml(a.mentorInstitution || "") +
          "</p></div>" +
          badge +
          '</div><p class="app-meta">' +
          applied +
          score +
          extra +
          "</p></div>"
        );
      })
      .join("");

    el.querySelectorAll(".app-card").forEach(function (card) {
      card.addEventListener("click", function () {
        var slug = card.getAttribute("data-skill-slug");
        var cid = card.getAttribute("data-app-conv");
        if (cid && slug) {
          selectedSlug = slug;
          conversationId = cid;
          void loadSkillDetail(slug).then(function () {
            show("chat");
            void refreshChatPage();
          });
        }
      });
    });
  }

  function renderAppListFiltered(pendingOnly) {
    var f = appsStore.filter(function (a) {
      if (!pendingOnly) return true;
      return (
        a.status === "CHATTING" ||
        a.status === "UNDER_REVIEW" ||
        a.status === "INTERVIEW_SCHEDULED"
      );
    });
    renderAppList(f);
  }

  function renderConvList() {
    var el = document.getElementById("convContent");
    if (!el) return;
    var withConv = appsStore.filter(function (a) {
      return a.conversationId;
    });
    if (!withConv.length) {
      el.innerHTML =
        '<p style="padding:24px;color:var(--text-light)">No conversations yet.</p>';
      return;
    }
    el.innerHTML = withConv
      .map(function (a) {
        return (
          '<div class="conv-card" data-app-conv="' +
          escapeHtml(a.conversationId) +
          '" data-skill-slug="' +
          escapeHtml(a.skill && a.skill.slug ? a.skill.slug : "") +
          '">' +
          '<div class="conv-card-header"><h5>Agent · ' +
          escapeHtml(a.mentorName || "Mentor") +
          '</h5><span class="dot dot-green"></span></div>' +
          '<p class="conv-card-preview">Continue your conversation about ' +
          escapeHtml((a.skill && a.skill.title) || "") +
          ".</p>" +
          '<div class="conv-meta"><span>Active</span><span>' +
          fmtDate(a.lastMessageAt) +
          "</span></div></div>"
        );
      })
      .join("");
    el.querySelectorAll(".conv-card").forEach(function (card) {
      card.addEventListener("click", function () {
        var slug = card.getAttribute("data-skill-slug");
        var cid = card.getAttribute("data-app-conv");
        selectedSlug = slug;
        conversationId = cid;
        void loadSkillDetail(slug).then(function () {
          show("chat");
          void refreshChatPage();
        });
      });
    });
  }

  async function refreshApplicationsPage() {
    if (!user || user.role !== "STUDENT") {
      alert("Sign in as a student to view applications.");
      show("auth");
      return;
    }
    try {
      var data = await fetchJSON("/api/applications");
      appsStore = data.applications || [];
      var mats = data.materials;
      var total = appsStore.length;
      var pend = appsStore.filter(function (a) {
        return (
          a.status === "CHATTING" ||
          a.status === "UNDER_REVIEW" ||
          a.status === "INTERVIEW_SCHEDULED"
        );
      }).length;
      var acc = appsStore.filter(function (a) {
        return a.status === "ACCEPTED";
      }).length;
      var conv = appsStore.filter(function (a) {
        return a.conversationId;
      }).length;
      var stats = document.querySelectorAll("#applications .stat-card .val");
      if (stats[0]) stats[0].textContent = String(total);
      if (stats[1]) stats[1].textContent = String(pend);
      if (stats[2]) stats[2].textContent = String(acc);
      if (stats[3]) stats[3].textContent = String(conv);
      renderAppList(appsStore);

      var matCard = document.querySelector("#applications .materials-card");
      if (matCard && Array.isArray(mats)) {
        var mh = "<h5>📎 My Application Materials</h5>";
        mats.forEach(function (item) {
          var name = item.name || item.fileName || "File";
          var st = item.statusLabel || item.updatedLabel || "";
          mh +=
            '<div class="material-item"><div class="material-info"><div class="material-icon">📄</div><div><div class="material-name">' +
            escapeHtml(name) +
            '</div><div class="material-status">' +
            escapeHtml(st) +
            '</div></div></div><div class="material-actions"><button type="button" class="btn-ghost">Edit</button></div></div>';
        });
        mh +=
          '<button type="button" class="btn btn-outline" style="width:100%;margin-top:12px;font-size:13px">+ Upload Material</button>';
        matCard.innerHTML = mh;
      }

      var notifs = await fetchJSON("/api/notifications").catch(function () {
        return { notifications: [] };
      });
      var nitems = notifs.notifications || [];
      var nc = document.querySelector("#applications .notifs-card");
      if (nc) {
        var nh = "<h5>🔔 Notifications</h5>";
        nitems.forEach(function (n) {
          nh +=
            '<div class="notif-item' +
            (n.read ? "" : " unread") +
            '"><p>' +
            escapeHtml(n.message) +
            '</p><div class="notif-time">' +
            fmtDate(n.createdAt) +
            "</div></div>";
        });
        if (!nitems.length)
          nh +=
            '<p style="padding:12px;color:var(--text-light)">No notifications.</p>';
        nc.innerHTML = nh;
      }
    } catch (e) {
      alert(e.message);
    }
  }

  async function refreshDashboardPage() {
    if (!user || user.role !== "MENTOR") {
      alert("Sign in as a mentor (researcher) to open the dashboard.");
      show("auth");
      return;
    }
    try {
      var dash = await fetchJSON("/api/mentor/dashboard");
      var apps = await fetchJSON("/api/mentor/applications");
      var metrics = dash.metrics || {};
      var mvals = document.querySelectorAll("#dash-overview .metric .val");
      if (mvals[0]) mvals[0].textContent = String(metrics.pendingApplications ?? 0);
      if (mvals[1]) mvals[1].textContent = String(metrics.conversationsThisWeek ?? 0);
      if (mvals[2]) mvals[2].textContent = String(metrics.openPositions ?? 0);
      if (mvals[3])
        mvals[3].textContent =
          metrics.avgAiScorePercent != null
            ? metrics.avgAiScorePercent + "%"
            : "—";

      var badge = document.getElementById("sb-dash-app-badge");
      if (badge) badge.textContent = String((apps.applications || []).length);

      var mp = user.mentorProfile;
      if (mp) {
        var sideName = document.querySelector("#dashboard .dash-sidebar .avatar + div div:first-child");
        var sideInst = document.querySelector("#dashboard .dash-sidebar .avatar + div div:last-child");
        if (sideName) sideName.textContent = mp.displayName || "";
        if (sideInst) sideInst.textContent = mp.institution || "";
        var avs = document.querySelectorAll("#dashboard .dash-sidebar .avatar");
        if (avs[0])
          avs[0].textContent = initialsFromRawName(mp.displayName || "");
        var navAv = document.querySelector("#dashboard nav .avatar");
        if (navAv) navAv.textContent = initialsFromRawName(mp.displayName || "");
      }

      var ovTitle = document.querySelector("#dash-overview h2");
      if (ovTitle && mp && mp.displayName) {
        ovTitle.textContent = "Welcome, " + mp.displayName.split(" ").pop();
      }

      var overviewCards = document.querySelectorAll("#dash-overview > .card");
      var card = overviewCards[1];
      if (card) {
        var top = apps.applications || [];
        var html = "";
        top.slice(0, 5).forEach(function (a) {
          var sn = a.studentName || "Student";
          var score =
            a.matchScorePercent != null
              ? '<span class="badge badge-green" style="margin-left:10px">Agent Score: ' +
                a.matchScorePercent +
                "/100</span>"
              : "";
          html +=
            '<div class="req-item"><div class="avatar" style="width:44px;height:44px;font-size:14px">' +
            escapeHtml(initialsFromRawName(sn)) +
            '</div><div class="req-info"><h5>' +
            escapeHtml(sn) +
            " " +
            score +
            '</h5><p>' +
            escapeHtml((a.skill && a.skill.title) || "") +
            " · " +
            escapeHtml(a.studentBackground || "") +
            '</p></div><div class="req-actions">' +
            '<button type="button" class="btn-ghost" style="color:#2D7A4F;border-color:rgba(45,122,79,0.3)" data-aid="' +
            escapeHtml(a.id) +
            '" data-act="ACCEPTED">Accept</button>' +
            '<button type="button" class="btn-ghost" data-aid="' +
            escapeHtml(a.id) +
            '" data-act="INTERVIEW_SCHEDULED">Interview</button>' +
            '<button type="button" class="btn-ghost" style="color:#C53030;border-color:rgba(197,48,48,0.3)" data-aid="' +
            escapeHtml(a.id) +
            '" data-act="REJECTED">Pass</button></div></div>';
        });
        if (!html)
          html =
            '<p style="padding:16px;color:var(--text-light)">No applications yet.</p>';
        card.innerHTML = html;
        card.querySelectorAll("button[data-aid]").forEach(function (btn) {
          btn.addEventListener("click", async function (e) {
            e.preventDefault();
            var id = btn.getAttribute("data-aid");
            var act = btn.getAttribute("data-act");
            try {
              await fetchJSON("/api/applications/" + encodeURIComponent(id), {
                method: "PATCH",
                body: JSON.stringify({ status: act }),
              });
              await refreshDashboardPage();
            } catch (err) {
              alert(err.message);
            }
          });
        });
      }

      var tbody = document.querySelector("#dash-applications tbody");
      if (tbody) {
        tbody.innerHTML = (apps.applications || [])
          .map(function (a) {
            var sc =
              a.matchScorePercent != null
                ? '<span class="badge badge-green">' + a.matchScorePercent + "/100</span>"
                : "—";
            return (
              "<tr><td><strong>" +
              escapeHtml(a.studentName || "") +
              '</strong><br><span style="font-size:12px;color:var(--text-light)">' +
              escapeHtml(a.studentBackground || "") +
              "</span></td><td>" +
              escapeHtml((a.skill && a.skill.title) || "") +
              "</td><td>" +
              sc +
              '</td><td><span class="badge badge-green">' +
              escapeHtml(a.statusLabelZh || a.status) +
              "</span></td><td>" +
              fmtDate(a.lastMessageAt) +
              '</td><td><button type="button" class="btn-ghost sb-open-conv" style="font-size:11px" data-conv="' +
              escapeHtml(a.conversationId || "") +
              '" data-slug="' +
              escapeHtml((a.skill && a.skill.slug) || "") +
              '">View</button></td></tr>'
            );
          })
          .join("");
        tbody.querySelectorAll(".sb-open-conv").forEach(function (btn) {
          btn.addEventListener("click", function () {
            var cid = btn.getAttribute("data-conv");
            var slug = btn.getAttribute("data-slug");
            if (!cid || !slug) return;
            selectedSlug = slug;
            conversationId = cid;
            void loadSkillDetail(slug).then(function () {
              show("chat");
              void refreshChatPage();
            });
          });
        });
      }

      var firstSlug =
        dash.skills && dash.skills[0] && dash.skills[0].slug;
      if (firstSlug) {
        var det = await fetchJSON(
          "/api/skills/" + encodeURIComponent(firstSlug),
        ).catch(function () {
          return null;
        });
        if (det && det.skill) {
          var grid = document.querySelector("#dash-projects .project-grid");
          if (grid) {
            grid.innerHTML = (det.skill.projects || [])
              .map(function (p) {
                var badge =
                  p.status === "OPEN"
                    ? '<span class="badge badge-green">Open</span>'
                    : '<span class="badge badge-red">Closed</span>';
                var meta = (p.metaTags || [])
                  .map(function (t) {
                    return '<span class="tag">' + escapeHtml(t) + "</span>";
                  })
                  .join("");
                return (
                  '<div class="project-card"><div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:12px"><h5>' +
                  escapeHtml(p.title) +
                  "</h5>" +
                  badge +
                  "</div><p>" +
                  escapeHtml(p.description) +
                  '</p><div class="project-meta">' +
                  meta +
                  "</div></div>"
                );
              })
              .join("");
          }
        }
      }
    } catch (e) {
      alert(e.message);
    }
  }

  document.addEventListener("click", function (e) {
    var t = e.target;
    if (t.closest && t.closest("[data-chat-slug]")) {
      var btn = t.closest("[data-chat-slug]");
      e.stopPropagation();
      e.preventDefault();
      var slug = btn.getAttribute("data-chat-slug");
      if (slug) void startChatWithSlug(slug);
      return;
    }
    var card = t.closest && t.closest(".mentor-card[data-slug]");
    if (card && !t.closest("[data-chat-slug]")) {
      selectedSlug = card.getAttribute("data-slug");
      show("profile");
    }
  });

  document.addEventListener("DOMContentLoaded", function () {
    void refreshMe();
    renderAuthState();
    var codeInput = authEl("authCode");
    if (codeInput) {
      codeInput.addEventListener("input", function () {
        codeInput.value = codeInput.value.replace(/\D/g, "").slice(0, 6);
      });
    }
    var cards = document.querySelectorAll("#landing .role-card");
    if (cards[0])
      cards[0].onclick = function () {
        show("browse");
      };
    if (cards[1])
      cards[1].onclick = function () {
        if (user && user.role === "MENTOR") show("dashboard");
        else {
          authRole = "mentor";
          var rb = document.querySelectorAll("#auth .role-btn")[1];
          if (rb) setAuthRole("mentor", rb);
          show("auth");
        }
      };
  });
})();
