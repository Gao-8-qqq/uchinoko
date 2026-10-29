"use strict";
(function () {
const {
  useState,
  useEffect,
  useCallback
} = React;
const SUPABASE_URL = 'https://xqnhxjepxzglmsnmdrvm.supabase.co';
const SUPABASE_KEY = 'sb_publishable_FRoeyOoJFYtM7QsQ8cjuqw_2yqFF7bj';
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
async function ensureGuest() {
  const {
    data
  } = await sb.auth.getSession();
  if (data.session) return;
  const res = await sb.auth.signInAnonymously();
  if (res.error) throw new Error('ゲストで始められなかった…（' + res.error.message + '）');
}
const REDIRECT_TO = location.origin + location.pathname;
const STAMPS = [{
  id: 'sasatta',
  label: '刺さった'
}, {
  id: 'suki',
  label: '好き'
}, {
  id: 'naita',
  label: '泣いた'
}, {
  id: 'kaishaku',
  label: '解釈一致'
}, {
  id: 'oseru',
  label: '推せる'
}, {
  id: 'kininaru',
  label: '気になる'
}];
const TAG_GROUPS = [{
  label: '雰囲気',
  tags: ['切ない', '熱い', '明るい', '重い', '静か', '不穏']
}, {
  label: 'キャラの立ち位置',
  tags: ['主人公', 'ヒロイン・ヒーロー', '相棒', '敵役', '師匠', '家族']
}, {
  label: '作品の形',
  tags: ['漫画', '小説', 'イラスト', 'ゲーム', 'TRPG']
}];
const SERVICES = {
  youtube: 'YouTube',
  spotify: 'Spotify',
  apple_music: 'Apple Music',
  amazon_music: 'Amazon Music'
};
const KIND_LABEL = {
  chara: 'キャラ',
  work: '作品'
};
function detectService(raw) {
  try {
    const u = new URL(raw.trim());
    if (u.protocol !== 'https:') return null;
    const h = u.hostname.replace(/^www\./, '').replace(/^m\./, '');
    if (h === 'youtu.be' || h === 'youtube.com' || h === 'music.youtube.com') return 'youtube';
    if (h === 'open.spotify.com' || h === 'spotify.link') return 'spotify';
    if (h === 'music.apple.com') return 'apple_music';
    if (h === 'music.amazon.co.jp' || h === 'music.amazon.com') return 'amazon_music';
    if ((h === 'amazon.co.jp' || h === 'amazon.com') && u.pathname.startsWith('/music')) return 'amazon_music';
  } catch (e) {}
  return null;
}
const LINK_SITES = ['x.com', 'twitter.com', 'bsky.app', 'misskey.io', 'threads.net', 'instagram.com', 'tiktok.com', 'tumblr.com', 'pixiv.net', 'fanbox.cc', 'booth.pm', 'skeb.jp', 'poipiku.com', 'privatter.net', 'fusetter.com', 'potofu.me', 'lit.link', 'linktr.ee', 'carrd.co', 'github.io', 'youtube.com', 'youtu.be', 'nicovideo.jp', 'note.com', 'kakuyomu.jp', 'syosetu.com', 'alphapolis.co.jp', 'estar.jp', 'novelup.plus', 'pixiv.me'];
function linkHost(raw) {
  try {
    const u = new URL(String(raw).trim());
    if (u.protocol !== 'https:' || u.username || u.password || u.port) return null;
    const h = u.hostname.toLowerCase();
    return LINK_SITES.some(d => h === d || h.endsWith('.' + d)) ? h.replace(/^www\./, '') : null;
  } catch (e) {
    return null;
  }
}
function isOkLink(raw) {
  if (!raw.trim()) return true;
  return !!linkHost(raw);
}
async function fetchMeta(url) {
  try {
    await ensureGuest();
    const {
      data,
      error
    } = await sb.functions.invoke('track-info', {
      body: {
        url
      }
    });
    if (!error && data) return {
      title: data.title || '',
      artist: data.artist || '',
      thumbnail: data.thumbnail || ''
    };
  } catch (e) {}
  return {};
}
function errMsg(e) {
  const m = e && (e.message || e.details) || String(e);
  if (m.includes('daily_limit_reached')) return '今日の受け取りはここまで。また明日届くよ。';
  if (m.includes('login_required')) return 'この機能はログインが必要だよ。';
  if (m.includes('tracks_must_be_1_to_10')) return 'イメソンは1〜10曲で入れてね。';
  if (m.includes('create_limit_reached')) return '今日流せるのはここまで。また明日ね。';
  if (m.includes('oc_posts_name_check')) return '名前は60字以内で入れてね。';
  if (m.includes('url_check')) return 'リンクは https:// から始まるものを入れてね。';
  if (m.includes('oc_posts_links_allowed')) return 'このサイトのリンクは載せられないみたい。';
  if (m.includes('oc_tracks_url_allowed')) return '曲は YouTube / Spotify / Apple Music / Amazon Music のリンクだけ入れられるよ。';
  if (m.includes('duplicate key')) return 'もう送信済みだよ。';
  return 'うまくいかなかった…（' + m + '）';
}
function Toast({
  text
}) {
  if (!text) return null;
  return React.createElement("div", {
    className: "toast",
    role: "status"
  }, text);
}
function Sheet({
  onClose,
  children
}) {
  return React.createElement("div", {
    className: "overlay",
    onClick: onClose
  }, React.createElement("div", {
    className: "sheet",
    onClick: e => e.stopPropagation()
  }, children));
}
function Confirm({
  title,
  body,
  okLabel,
  onOk,
  onCancel
}) {
  return React.createElement(Sheet, {
    onClose: onCancel
  }, React.createElement("h3", null, title), body && React.createElement("p", null, body), React.createElement("div", {
    className: "row"
  }, React.createElement("button", {
    className: "btn ghost",
    onClick: onCancel
  }, "やめる"), React.createElement("button", {
    className: "btn danger",
    onClick: onOk
  }, okLabel)));
}
function TrackItem({
  t,
  i
}) {
  return React.createElement("li", null, React.createElement("a", {
    className: "trow",
    href: t.url,
    target: "_blank",
    rel: "noopener noreferrer"
  }, React.createElement("span", {
    className: "tno"
  }, i + 1), t.thumbnail && React.createElement("img", {
    className: "tthumb",
    src: t.thumbnail,
    alt: "",
    loading: "lazy",
    referrerPolicy: "no-referrer"
  }), React.createElement("span", {
    className: "m"
  }, React.createElement("div", {
    className: "t"
  }, t.title || SERVICES[t.service] + ' の曲'), t.artist && React.createElement("div", {
    className: "a"
  }, t.artist), React.createElement("div", {
    className: "s"
  }, SERVICES[t.service], " で聴く")), React.createElement("span", {
    className: "play",
    "aria-hidden": "true"
  }, React.createElement("svg", {
    viewBox: "0 0 12 12"
  }, React.createElement("path", {
    d: "M2 1.2v9.6L10.6 6z",
    fill: "currentColor"
  })))));
}
function SafeLink({
  href,
  children
}) {
  const host = href && linkHost(href);
  if (!host) return null;
  return React.createElement("a", {
    className: "lnk",
    href: href,
    target: "_blank",
    rel: "noopener noreferrer nofollow ugc"
  }, children, React.createElement("small", {
    style: {
      opacity: .7,
      marginLeft: 4
    }
  }, "（", host, "）"));
}
function LoginForm({
  user,
  toast
}) {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const submit = async e => {
    e.preventDefault();
    if (!email.includes('@')) return toast('メールアドレスを入れてね');
    setBusy(true);
    try {
      if (user && user.is_anonymous) {
        const {
          error
        } = await sb.auth.updateUser({
          email
        }, {
          emailRedirectTo: REDIRECT_TO
        });
        if (!error) {
          setSent(true);
          return;
        }
        if (!/already|exists|registered/i.test(error.message)) throw error;
      }
      const {
        error
      } = await sb.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: REDIRECT_TO
        }
      });
      if (error) throw error;
      setSent(true);
    } catch (err) {
      toast(errMsg(err));
    } finally {
      setBusy(false);
    }
  };
  const google = async () => {
    setBusy(true);
    const {
      error
    } = await sb.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: REDIRECT_TO
      }
    });
    if (error) {
      setBusy(false);
      toast(errMsg(error));
    }
  };
  if (sent) return React.createElement("p", {
    className: "hint ok"
  }, "メールを送ったよ。届いたリンクを開くとログインできる。");
  return React.createElement("div", null, React.createElement("button", {
    className: "btn social",
    onClick: google,
    disabled: busy
  }, React.createElement("svg", {
    viewBox: "0 0 18 18",
    "aria-hidden": "true"
  }, React.createElement("path", {
    d: "M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z",
    fill: "#4285F4"
  }), React.createElement("path", {
    d: "M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z",
    fill: "#34A853"
  }), React.createElement("path", {
    d: "M3.97 10.72A5.41 5.41 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.95H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.05l3.01-2.33z",
    fill: "#FBBC05"
  }), React.createElement("path", {
    d: "M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z",
    fill: "#EA4335"
  })), "Googleでログイン"), React.createElement("div", {
    className: "or"
  }, React.createElement("span", null, "またはメールで")), React.createElement("form", {
    onSubmit: submit
  }, React.createElement("input", {
    className: "input",
    type: "email",
    autoComplete: "email",
    value: email,
    "aria-label": "メールアドレス",
    onChange: e => setEmail(e.target.value),
    placeholder: "you@example.com"
  }), React.createElement("p", {
    className: "hint"
  }, "パスワードはいらないよ。届いたリンクを開くだけ。"), React.createElement("button", {
    className: "btn ghost",
    disabled: busy,
    style: {
      marginTop: 10
    }
  }, busy ? '送信中…' : 'ログインリンクを送る')));
}
function ReceiveTab({
  genres,
  toast,
  goCreate
}) {
  const [genre, setGenre] = useState(null);
  const [tags, setTags] = useState([]);
  const [busy, setBusy] = useState(false);
  const [got, setGot] = useState(null);
  const [none, setNone] = useState(false);
  const [stamp, setStamp] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const toggleTag = t => setTags(ts => ts.includes(t) ? ts.filter(x => x !== t) : [...ts, t]);
  const receive = async () => {
    if (!genre) return;
    setBusy(true);
    setNone(false);
    try {
      await ensureGuest();
      const {
        data,
        error
      } = await sb.rpc('receive_oc_post', {
        p_genre_id: genre.id,
        p_tags: tags
      });
      if (error) throw error;
      if (!data) {
        setNone(true);
        return;
      }
      setGot(data);
      setStamp(null);
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    } catch (e) {
      toast(errMsg(e));
    } finally {
      setBusy(false);
    }
  };
  const sendStamp = async id => {
    if (stamp) return;
    setStamp(id);
    const {
      error
    } = await sb.from('oc_reactions').insert({
      delivery_id: got.delivery_id,
      post_id: got.post_id,
      stamp: id
    });
    if (error) {
      setStamp(null);
      toast(errMsg(error));
      return;
    }
    toast('作者さんにこっそり届けたよ');
  };
  const report = async () => {
    setConfirm(null);
    const {
      error
    } = await sb.from('reports').insert({
      target_type: 'oc_post',
      target_id: got.post_id
    });
    if (error) return toast(errMsg(error));
    toast('通報したよ。ありがとう');
  };
  const block = async () => {
    setConfirm(null);
    const {
      error
    } = await sb.rpc('block_oc_author', {
      p_delivery_id: got.delivery_id
    });
    if (error) return toast(errMsg(error));
    toast('この作者さんの投稿はもう届かないよ');
    setGot(null);
  };
  if (got) {
    return React.createElement("div", null, React.createElement("article", {
      className: "panel profile"
    }, React.createElement("div", {
      className: "head"
    }, React.createElement("div", {
      className: "card"
    }, React.createElement("p", {
      className: "from"
    }, got.genre, "のうちの子が届いたよ"), React.createElement("h2", {
      className: "name display"
    }, got.name), got.tags && got.tags.length > 0 && React.createElement("div", {
      className: "meta"
    }, got.tags.map(t => React.createElement("span", {
      key: t,
      className: "chip static"
    }, t)))), React.createElement("div", {
      className: "hanko",
      "aria-label": KIND_LABEL[got.kind]
    }, KIND_LABEL[got.kind])), got.intro && React.createElement("p", {
      className: "genkou"
    }, got.intro), (got.author_name || got.work_url || got.author_url) && React.createElement("div", {
      className: "credit"
    }, React.createElement("span", {
      className: "by"
    }, got.author_name ? '作・' + got.author_name : ''), React.createElement(SafeLink, {
      href: got.work_url
    }, "作品を見る"), React.createElement(SafeLink, {
      href: got.author_url
    }, "作者を見る")), React.createElement("div", {
      className: "songs-title display"
    }, "イメソン"), React.createElement("ul", {
      className: "tracklist"
    }, (got.tracks || []).map((t, i) => React.createElement(TrackItem, {
      key: i,
      t: t,
      i: i
    }))), React.createElement("p", {
      className: "disclaimer"
    }, "イメソンは、作者さんが「この子に合う」と感じて選んだものです。楽曲やアーティストさんとは関係がなく、公式に認められたものではありません。曲やアーティストさんを悪く言ったり、ご本人に迷惑がかかるような楽しみ方はしないでね。"), React.createElement("div", {
      className: "react"
    }, React.createElement("p", null, stamp ? '作者さんに届けたよ' : '聴いたら、感想をスタンプで'), React.createElement("div", {
      className: "stamps"
    }, STAMPS.map(s => React.createElement("button", {
      key: s.id,
      className: 'stamp' + (stamp === s.id ? ' on' : ''),
      disabled: !!stamp,
      onClick: () => sendStamp(s.id)
    }, s.label))))), React.createElement("div", {
      style: {
        marginTop: 16
      }
    }, React.createElement("button", {
      className: "btn",
      onClick: () => setGot(null)
    }, "次のうちの子を探す")), React.createElement("div", {
      style: {
        textAlign: 'center',
        marginTop: 10
      }
    }, React.createElement("button", {
      className: "linkish",
      onClick: () => setConfirm('report')
    }, "通報する"), React.createElement("button", {
      className: "linkish",
      onClick: () => setConfirm('block')
    }, "この作者さんをブロック")), confirm === 'report' && React.createElement(Confirm, {
      title: "この投稿を通報する？",
      body: "版権キャラ、成人向け、迷惑な内容などを見つけたときに使ってね。",
      okLabel: "通報する",
      onOk: report,
      onCancel: () => setConfirm(null)
    }), confirm === 'block' && React.createElement(Confirm, {
      title: "この作者さんをブロックする？",
      body: "相手が誰かはわからないまま、この人の投稿が届かなくなるよ。",
      okLabel: "ブロックする",
      onOk: block,
      onCancel: () => setConfirm(null)
    }));
  }
  return React.createElement("div", null, React.createElement("section", {
    className: "panel hero"
  }, React.createElement("div", {
    className: "story"
  }, React.createElement("h2", {
    className: "display"
  }, "誰かのうちの子と、その子のイメソンが届く。"), React.createElement("p", null, "ジャンルを選ぶと、どこかの創作者さんの「うちの子」と主題歌が届くよ。あなたのうちの子も流してみてね。"), React.createElement("button", {
    className: "btn ghost",
    onClick: goCreate
  }, "うちの子を流す")), React.createElement("div", {
    className: "tate",
    "aria-hidden": "true"
  }, React.createElement("span", null, "うちの子に、主題歌を。"))), React.createElement("div", {
    className: "sec-head"
  }, React.createElement("h3", {
    className: "display"
  }, "どんな物語が読みたい？"), React.createElement("span", {
    className: "note"
  }, "ジャンルを1つ選んでね")), React.createElement("div", {
    className: "genres",
    role: "radiogroup",
    "aria-label": "ジャンル"
  }, genres.map(g => React.createElement("button", {
    key: g.id,
    className: 'genre' + (genre && genre.id === g.id ? ' on' : ''),
    disabled: busy,
    role: "radio",
    "aria-checked": !!genre && genre.id === g.id,
    onClick: () => {
      setGenre(cur => cur && cur.id === g.id ? null : g);
      setNone(false);
    }
  }, React.createElement("span", null, g.name)))), React.createElement("details", {
    className: "more"
  }, React.createElement("summary", null, "もう少し絞る", tags.length > 0 ? `（${tags.length}）` : '（なくてもOK）'), React.createElement("div", {
    className: "inner"
  }, TAG_GROUPS.map(gr => React.createElement("div", {
    className: "tag-group",
    key: gr.label
  }, React.createElement("div", {
    className: "label"
  }, gr.label), React.createElement("div", {
    className: "chips"
  }, gr.tags.map(t => React.createElement("button", {
    key: t,
    className: 'chip' + (tags.includes(t) ? ' on' : ''),
    "aria-pressed": tags.includes(t),
    onClick: () => toggleTag(t)
  }, t))))), tags.length > 0 && React.createElement("button", {
    className: "linkish",
    style: {
      marginTop: 6
    },
    onClick: () => setTags([])
  }, "絞り込みを外す"))), none && React.createElement("div", {
    className: "note-box",
    style: {
      marginTop: 14
    }
  }, "この条件のうちの子は、今はもう届けられるものがないみたい。絞り込みを外すか、別のジャンルを選んでみてね。"), React.createElement("div", {
    className: "receive-bar"
  }, React.createElement("button", {
    className: "btn",
    disabled: !genre || busy,
    onClick: receive
  }, busy ? '探してるよ…' : genre ? `「${genre.name}」のうちの子を受け取る` : 'ジャンルを選んでね')));
}
const emptyTrack = () => ({
  url: '',
  title: '',
  artist: '',
  thumbnail: '',
  service: null,
  loading: false
});
function CreateTab({
  user,
  genres,
  toast,
  onCreated,
  openLogin,
  guestCanCreate
}) {
  const [kind, setKind] = useState('chara');
  const [name, setName] = useState('');
  const [intro, setIntro] = useState('');
  const [genreId, setGenreId] = useState(null);
  const [tags, setTags] = useState([]);
  const [authorName, setAuthorName] = useState('');
  const [workUrl, setWorkUrl] = useState('');
  const [authorUrl, setAuthorUrl] = useState('');
  const [tracks, setTracks] = useState([emptyTrack()]);
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  if (user ? user.is_anonymous && !guestCanCreate : !guestCanCreate) {
    return React.createElement("div", null, React.createElement("h2", {
      className: "page display"
    }, "うちの子を流す"), React.createElement("div", {
      className: "panel",
      style: {
        padding: 16
      }
    }, React.createElement("p", {
      style: {
        marginTop: 0
      }
    }, "流すにはログインが必要だよ。メールアドレスかGoogleでOK。"), React.createElement("button", {
      className: "btn",
      onClick: openLogin
    }, "ログインする")));
  }
  const update = (i, patch) => setTracks(ts => ts.map((t, j) => j === i ? {
    ...t,
    ...patch
  } : t));
  const onUrlBlur = async i => {
    const t = tracks[i];
    const service = detectService(t.url);
    update(i, {
      service
    });
    if (!service || t.title || t.loading) return;
    update(i, {
      loading: true
    });
    const meta = await fetchMeta(t.url.trim());
    setTracks(ts => ts.map((x, j) => j !== i ? x : {
      ...x,
      loading: false,
      title: x.title || meta.title || '',
      artist: x.artist || meta.artist || '',
      thumbnail: meta.thumbnail || ''
    }));
  };
  const toggleTag = t => setTags(ts => ts.includes(t) ? ts.filter(x => x !== t) : ts.length >= 8 ? ts : [...ts, t]);
  const filled = tracks.filter(t => t.url.trim());
  const tracksOk = filled.length >= 1 && filled.every(t => detectService(t.url));
  const linksOk = isOkLink(workUrl) && isOkLink(authorUrl);
  const canSubmit = name.trim() && genreId && tracksOk && linksOk && agree && !busy;
  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    try {
      const p = {
        kind,
        name: name.trim(),
        intro,
        genre_id: genreId,
        tags,
        author_name: authorName,
        work_url: workUrl.trim(),
        author_url: authorUrl.trim(),
        tracks: filled.map(t => ({
          url: t.url.trim(),
          service: detectService(t.url),
          title: t.title.trim() || null,
          artist: t.artist.trim() || null,
          thumbnail: t.thumbnail || null
        }))
      };
      await ensureGuest();
      const {
        error
      } = await sb.rpc('create_oc_post', {
        p
      });
      if (error) throw error;
      toast('うちの子を流したよ。誰かに届きますように');
      setName('');
      setIntro('');
      setGenreId(null);
      setTags([]);
      setTracks([emptyTrack()]);
      setAgree(false);
      onCreated();
    } catch (e) {
      toast(errMsg(e));
    } finally {
      setBusy(false);
    }
  };
  return React.createElement("div", null, React.createElement("h2", {
    className: "page display"
  }, "うちの子を流す"), (!user || user.is_anonymous) && React.createElement("p", {
    className: "hint"
  }, "ゲストのままでも流せるよ。ただ、ゲストで流した投稿はこのブラウザでしか見返せないから、 残したいなら", React.createElement("button", {
    className: "linkish",
    style: {
      padding: 0
    },
    onClick: openLogin
  }, "ログイン"), "がおすすめ。"), React.createElement("label", {
    className: "field"
  }, "なにを流す？"), React.createElement("div", {
    className: "seg",
    role: "radiogroup",
    "aria-label": "種類"
  }, React.createElement("button", {
    className: kind === 'chara' ? 'on' : '',
    role: "radio",
    "aria-checked": kind === 'chara',
    onClick: () => setKind('chara')
  }, "キャラ"), React.createElement("button", {
    className: kind === 'work' ? 'on' : '',
    role: "radio",
    "aria-checked": kind === 'work',
    onClick: () => setKind('work')
  }, "作品")), React.createElement("label", {
    className: "field",
    htmlFor: "oc-name"
  }, kind === 'chara' ? 'キャラの名前' : '作品のタイトル'), React.createElement("input", {
    id: "oc-name",
    className: "input display",
    style: {
      fontSize: 18
    },
    maxLength: 60,
    value: name,
    onChange: e => setName(e.target.value),
    placeholder: kind === 'chara' ? '例：夜鳴 ヨル' : '例：夜の学校'
  }), React.createElement("label", {
    className: "field",
    htmlFor: "oc-intro"
  }, "ひとこと紹介", React.createElement("span", {
    className: "opt"
  }, "任意・200字まで")), React.createElement("textarea", {
    id: "oc-intro",
    className: "input genkou-in",
    maxLength: 200,
    value: intro,
    onChange: e => setIntro(e.target.value),
    placeholder: kind === 'chara' ? 'どんな子？ 好きなもの、抱えているもの、口ぐせなど' : 'どんなお話？ あらすじや見どころなど'
  }), React.createElement("p", {
    className: "hint"
  }, intro.length, " / 200\u3000歌詞は書き写さないでね"), React.createElement("label", {
    className: "field"
  }, "ジャンル"), React.createElement("div", {
    className: "genres small"
  }, genres.map(g => React.createElement("button", {
    key: g.id,
    className: 'genre' + (genreId === g.id ? ' on' : ''),
    "aria-pressed": genreId === g.id,
    onClick: () => setGenreId(g.id)
  }, React.createElement("span", null, g.name)))), React.createElement("label", {
    className: "field"
  }, "詳細タグ", React.createElement("span", {
    className: "opt"
  }, "任意・8つまで")), TAG_GROUPS.map(gr => React.createElement("div", {
    className: "tag-group",
    key: gr.label
  }, React.createElement("div", {
    className: "label"
  }, gr.label), React.createElement("div", {
    className: "chips"
  }, gr.tags.map(t => React.createElement("button", {
    key: t,
    className: 'chip' + (tags.includes(t) ? ' on' : ''),
    "aria-pressed": tags.includes(t),
    onClick: () => toggleTag(t)
  }, t))))), React.createElement("label", {
    className: "field"
  }, "イメソン", React.createElement("span", {
    className: "opt"
  }, "1〜10曲")), React.createElement("p", {
    className: "hint",
    style: {
      marginTop: 0
    }
  }, "イメソンは、あなたが「この子に合う」と感じた曲を選ぶもの。曲やアーティストさんの印象を悪くするような使い方はやめてね。"), tracks.map((t, i) => {
    const bad = t.url.trim() && !detectService(t.url);
    return React.createElement("div", {
      className: "trackrow",
      key: i
    }, React.createElement("div", {
      className: "num"
    }, React.createElement("span", null, React.createElement("span", {
      className: "tno"
    }, i + 1), " ", t.service && React.createElement("span", {
      className: "hint ok"
    }, SERVICES[t.service])), tracks.length > 1 && React.createElement("button", {
      className: "linkish",
      onClick: () => setTracks(ts => ts.filter((_, j) => j !== i))
    }, "削除")), React.createElement("input", {
      className: "input",
      inputMode: "url",
      placeholder: "YouTube / Spotify / Apple Music / Amazon Music のリンク",
      value: t.url,
      onChange: e => update(i, {
        url: e.target.value,
        service: null,
        title: '',
        artist: '',
        thumbnail: ''
      }),
      onBlur: () => onUrlBlur(i)
    }), React.createElement("div", {
      className: "meta-row"
    }, t.thumbnail && React.createElement("img", {
      className: "tthumb",
      src: t.thumbnail,
      alt: "",
      referrerPolicy: "no-referrer"
    }), React.createElement("div", {
      className: "meta-inputs"
    }, React.createElement("input", {
      className: "input",
      placeholder: t.loading ? '曲名を探してるよ…' : '曲名（自動で入るよ）',
      maxLength: 200,
      value: t.title,
      onChange: e => update(i, {
        title: e.target.value
      })
    }), React.createElement("input", {
      className: "input",
      placeholder: t.loading ? 'アーティストを探してるよ…' : 'アーティスト名（自動で入るよ）',
      maxLength: 200,
      value: t.artist,
      onChange: e => update(i, {
        artist: e.target.value
      })
    }))), bad && React.createElement("p", {
      className: "hint err"
    }, "対応してないリンクみたい。共有ボタンからコピーしたリンクを貼ってね。"));
  }), tracks.length < 10 && React.createElement("button", {
    className: "btn ghost",
    onClick: () => setTracks(ts => [...ts, emptyTrack()])
  }, "＋ 曲を追加"), React.createElement("label", {
    className: "field",
    htmlFor: "oc-author"
  }, "作者名", React.createElement("span", {
    className: "opt"
  }, "任意")), React.createElement("input", {
    id: "oc-author",
    className: "input",
    maxLength: 40,
    value: authorName,
    onChange: e => setAuthorName(e.target.value),
    placeholder: "ペンネーム"
  }), React.createElement("label", {
    className: "field",
    htmlFor: "oc-work"
  }, "作品リンク", React.createElement("span", {
    className: "opt"
  }, "任意")), React.createElement("input", {
    id: "oc-work",
    className: "input",
    inputMode: "url",
    value: workUrl,
    onChange: e => setWorkUrl(e.target.value),
    placeholder: "https://（pixiv、漫画・小説のページ、キャラ紹介など）"
  }), !isOkLink(workUrl) && React.createElement("p", {
    className: "hint err"
  }, "このサイトのリンクは載せられないみたい。X・pixiv・BOOTH・カクヨム・小説家になろう・note などのリンクを入れてね"), React.createElement("label", {
    className: "field",
    htmlFor: "oc-author-url"
  }, "作者リンク", React.createElement("span", {
    className: "opt"
  }, "任意")), React.createElement("input", {
    id: "oc-author-url",
    className: "input",
    inputMode: "url",
    value: authorUrl,
    onChange: e => setAuthorUrl(e.target.value),
    placeholder: "https://（X、pixivのプロフィールなど）"
  }), !isOkLink(authorUrl) && React.createElement("p", {
    className: "hint err"
  }, "このサイトのリンクは載せられないみたい。X・pixiv・Bluesky・ポトフ・lit.link などのリンクを入れてね"), React.createElement("p", {
    className: "hint"
  }, "安全のため、載せられるのは創作でよく使うサイトのリンクだけだよ"), React.createElement("label", {
    className: "field",
    style: {
      display: 'flex',
      gap: 8,
      alignItems: 'flex-start',
      fontWeight: 400
    }
  }, React.createElement("input", {
    type: "checkbox",
    checked: agree,
    onChange: e => setAgree(e.target.checked),
    style: {
      marginTop: 6
    }
  }), React.createElement("span", null, "自分のオリジナルのキャラ・作品です（版権キャラ・二次創作・成人向けは流せません）。曲やアーティストさんをおとしめる目的では使いません")), React.createElement("div", {
    style: {
      marginTop: 16
    }
  }, React.createElement("button", {
    className: "btn",
    disabled: !canSubmit,
    onClick: submit
  }, busy ? '流しています…' : 'このうちの子を流す'), !name.trim() && React.createElement("p", {
    className: "hint"
  }, "名前を入れてね"), name.trim() && !genreId && React.createElement("p", {
    className: "hint"
  }, "ジャンルを選んでね"), name.trim() && genreId && !tracksOk && React.createElement("p", {
    className: "hint"
  }, "イメソンを1曲以上入れてね"), name.trim() && genreId && tracksOk && !agree && React.createElement("p", {
    className: "hint"
  }, "最後のチェックを入れてね")));
}
function MeTab({
  user,
  toast,
  reloadKey,
  openLogin,
  openRules
}) {
  const [list, setList] = useState(null);
  const [tracksBy, setTracksBy] = useState({});
  const [open, setOpen] = useState({});
  const [del, setDel] = useState(null);
  const [bye, setBye] = useState(false);
  const guest = !user || user.is_anonymous;
  const load = useCallback(async () => {
    if (!user) {
      setList([]);
      return;
    }
    const {
      data,
      error
    } = await sb.rpc('my_oc_posts');
    if (error) {
      toast(errMsg(error));
      setList([]);
      return;
    }
    setList(data || []);
    const ids = (data || []).map(p => p.post_id);
    if (!ids.length) {
      setTracksBy({});
      return;
    }
    const res = await sb.from('oc_tracks').select('post_id,url,service,title,artist,thumbnail,position').in('post_id', ids).order('position');
    if (res.error) return;
    const by = {};
    for (const t of res.data) (by[t.post_id] = by[t.post_id] || []).push(t);
    setTracksBy(by);
  }, [user && user.id]);
  useEffect(() => {
    load();
  }, [load, reloadKey]);
  const remove = async () => {
    const id = del;
    setDel(null);
    const {
      error
    } = await sb.from('oc_posts').delete().eq('id', id);
    if (error) return toast(errMsg(error));
    toast('削除したよ');
    load();
  };
  const deleteAccount = async () => {
    setBye(false);
    const {
      error
    } = await sb.rpc('delete_my_account');
    if (error) return toast(errMsg(error));
    await sb.auth.signOut();
    toast('アカウントを削除したよ。今までありがとう');
  };
  return React.createElement("div", null, React.createElement("h2", {
    className: "page display"
  }, "じぶん"), React.createElement("div", {
    className: "panel",
    style: {
      padding: 14
    }
  }, guest ? React.createElement("div", null, React.createElement("p", {
    style: {
      marginTop: 0
    }
  }, "今はゲストで使ってるよ。ログインすると、流したうちの子をどの端末でも見返せる。"), React.createElement("button", {
    className: "btn",
    onClick: openLogin
  }, "ログインする")) : React.createElement("div", {
    className: "mine-head"
  }, React.createElement("span", {
    style: {
      wordBreak: 'break-all'
    }
  }, user.email), React.createElement("button", {
    className: "btn ghost small",
    onClick: () => sb.auth.signOut()
  }, "ログアウト"))), (!guest || list && list.length > 0) && React.createElement(React.Fragment, null, React.createElement("div", {
    className: "sec-head"
  }, React.createElement("h3", {
    className: "display"
  }, "流したうちの子")), guest && React.createElement("p", {
    className: "hint"
  }, "ゲストで流した投稿は、このブラウザを使い続けている間だけ見られるよ。"), list === null && React.createElement("div", {
    className: "loading",
    style: {
      padding: 20
    }
  }, "読み込み中…"), list && list.length === 0 && React.createElement("div", {
    className: "panel empty"
  }, "まだないよ。「流す」からうちの子を紹介してみよう。"), list && list.map(p => React.createElement("div", {
    className: "panel mine",
    key: p.post_id
  }, React.createElement("div", {
    className: "mine-head"
  }, React.createElement("span", {
    className: "chip static"
  }, KIND_LABEL[p.kind], "・", p.genre), React.createElement("button", {
    className: "linkish",
    onClick: () => setDel(p.post_id)
  }, "削除")), React.createElement("div", {
    className: "name display"
  }, p.name), React.createElement("div", {
    className: "hint"
  }, p.deliveries, "人に届いた"), React.createElement("div", {
    className: "counts"
  }, STAMPS.filter(s => p.stamps && p.stamps[s.id]).map(s => React.createElement("span", {
    className: "count",
    key: s.id
  }, s.label, React.createElement("b", null, p.stamps[s.id]))), (!p.stamps || Object.keys(p.stamps).length === 0) && React.createElement("span", {
    className: "hint"
  }, "まだスタンプはないよ")), React.createElement("button", {
    className: "toggle",
    "aria-expanded": !!open[p.post_id],
    onClick: () => setOpen(o => ({
      ...o,
      [p.post_id]: !o[p.post_id]
    }))
  }, open[p.post_id] ? '閉じる' : '流した内容を見る'), open[p.post_id] && React.createElement("div", {
    className: "mine-detail"
  }, p.tags && p.tags.length > 0 && React.createElement("div", {
    className: "meta"
  }, p.tags.map(t => React.createElement("span", {
    key: t,
    className: "chip static"
  }, t))), React.createElement("div", {
    className: "label"
  }, "ひとこと紹介"), p.intro ? React.createElement("p", {
    className: "genkou mini"
  }, p.intro) : React.createElement("p", {
    className: "hint"
  }, "（なし）"), React.createElement("div", {
    className: "label"
  }, "作者"), React.createElement("div", {
    className: "credit mini"
  }, React.createElement("span", {
    className: "by"
  }, p.author_name ? '作・' + p.author_name : '（作者名なし）'), React.createElement(SafeLink, {
    href: p.work_url
  }, "作品を見る"), React.createElement(SafeLink, {
    href: p.author_url
  }, "作者を見る")), !p.work_url && !p.author_url && React.createElement("p", {
    className: "hint"
  }, "リンクはなし"), React.createElement("div", {
    className: "label"
  }, "イメソン", tracksBy[p.post_id] ? `（${tracksBy[p.post_id].length}曲）` : ''), tracksBy[p.post_id] ? React.createElement("ul", {
    className: "tracklist",
    style: {
      padding: 0
    }
  }, tracksBy[p.post_id].map((t, i) => React.createElement(TrackItem, {
    key: i,
    t: t,
    i: i
  }))) : React.createElement("p", {
    className: "hint"
  }, "読み込み中…"), React.createElement("p", {
    className: "hint"
  }, "流した日：", new Date(p.created_at).toLocaleDateString('ja-JP')))))), !guest && React.createElement("div", {
    style: {
      textAlign: 'center',
      marginTop: 24
    }
  }, React.createElement("button", {
    className: "linkish",
    style: {
      color: 'var(--shu)'
    },
    onClick: () => setBye(true)
  }, "アカウントを削除する")), React.createElement("footer", {
    className: "foot"
  }, React.createElement("button", {
    className: "linkish",
    onClick: openRules
  }, "利用のきまり"), React.createElement("a", {
    className: "linkish",
    href: "./privacy.html"
  }, "プライバシーポリシー")), del && React.createElement(Confirm, {
    title: "この投稿を削除する？",
    body: "届いたスタンプも一緒に消えて、元に戻せないよ。",
    okLabel: "削除する",
    onOk: remove,
    onCancel: () => setDel(null)
  }), bye && React.createElement(Confirm, {
    title: "アカウントを削除する？",
    body: "投稿・スタンプ・受け取った記録がすべて消えて、元に戻せないよ。",
    okLabel: "削除する",
    onOk: deleteAccount,
    onCancel: () => setBye(false)
  }));
}
function Rules({
  onClose
}) {
  return React.createElement(Sheet, {
    onClose: onClose
  }, React.createElement("h3", null, "利用のきまり"), React.createElement("ul", null, React.createElement("li", null, "流せるのは、自分のオリジナルのキャラ・作品だけ。版権キャラ・二次創作は流せません"), React.createElement("li", null, "成人向けの内容、過激な暴力表現の紹介文やリンクは禁止"), React.createElement("li", null, "悪口、誹謗中傷、差別的な内容は禁止"), React.createElement("li", null, "曲は公式サービスのリンクだけを載せてね（違法アップロードのリンクは禁止）"), React.createElement("li", null, "イメソンは、作者さんが自分の解釈で選んだもの。楽曲・アーティストさんとは関係がなく、公式なものではありません"), React.createElement("li", null, "曲やアーティストさんをおとしめる目的で使ったり、アーティストさんご本人やその公式の場所（SNSのリプライ・コメント欄など）に投稿を送りつけたりしないでね"), React.createElement("li", null, "作品・作者リンクは、自分のページだけにしてね"), React.createElement("li", null, "歌詞は著作物なので、ひとことや紹介文に歌詞を書き写さないでね（曲名やアーティスト名の紹介はOK）"), React.createElement("li", null, "きまりに反する投稿は、運営が予告なく非表示・削除することがあります")), React.createElement("p", {
    style: {
      fontSize: 13
    }
  }, React.createElement("b", null, "権利者の方へ"), "：掲載内容に権利上の問題がある場合は、", React.createElement("a", {
    href: "mailto:qx042039711@gmail.com"
  }, "qx042039711@gmail.com"), " までご連絡ください。確認のうえ、速やかに非表示・削除などの対応をします。"), React.createElement("button", {
    className: "btn ghost",
    onClick: onClose
  }, "閉じる"));
}
function App() {
  const [user, setUser] = useState(undefined);
  const [genres, setGenres] = useState([]);
  const [guestCanCreate, setGuestCanCreate] = useState(false);
  const [tab, setTab] = useState('receive');
  const [toastText, setToastText] = useState('');
  const [loginOpen, setLoginOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [fatal, setFatal] = useState('');
  const toast = useCallback(t => {
    setToastText(t);
    clearTimeout(window.__toastTimer);
    window.__toastTimer = setTimeout(() => setToastText(''), 3200);
  }, []);
  useEffect(() => {
    let alive = true;
    sb.auth.getSession().then(({
      data
    }) => {
      if (alive) setUser(data.session ? data.session.user : null);
    });
    const {
      data: sub
    } = sb.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
        return;
      }
      if (session) setUser(session.user);
      if (event === 'SIGNED_IN' && session && !session.user.is_anonymous) setLoginOpen(false);
    });
    sb.from('app_settings').select('guest_can_create').eq('id', 1).maybeSingle().then(({
      data
    }) => {
      setGuestCanCreate(!!(data && data.guest_can_create));
    });
    sb.from('oc_genres').select('id,name').order('sort_order').then(({
      data,
      error
    }) => {
      if (error) setFatal('ジャンルを読み込めなかった…（' + error.message + '）');else setGenres(data || []);
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);
  if (user === undefined) return React.createElement("div", {
    className: "loading"
  }, "読み込み中…");
  const guest = !user || user.is_anonymous;
  return React.createElement("div", {
    className: "app"
  }, React.createElement("header", {
    className: "top"
  }, React.createElement("div", {
    className: "logo"
  }, React.createElement("h1", {
    className: "display"
  }, "うちの子イメソン便"), React.createElement("span", {
    className: "sub"
  }, "うちの子に、主題歌を。")), React.createElement("button", {
    className: "who",
    onClick: () => guest ? setLoginOpen(true) : setTab('me')
  }, guest ? 'ゲスト・ログイン' : 'ログイン中')), fatal && React.createElement("div", {
    className: "note-box",
    style: {
      marginTop: 14,
      borderColor: 'var(--shu)',
      color: 'var(--shu)'
    }
  }, fatal), tab === 'receive' && React.createElement(ReceiveTab, {
    genres: genres,
    toast: toast,
    goCreate: () => setTab('create')
  }), tab === 'create' && React.createElement(CreateTab, {
    user: user,
    genres: genres,
    toast: toast,
    guestCanCreate: guestCanCreate,
    openLogin: () => setLoginOpen(true),
    onCreated: () => {
      setReloadKey(k => k + 1);
      setTab('me');
    }
  }), tab === 'me' && React.createElement(MeTab, {
    user: user,
    toast: toast,
    reloadKey: reloadKey,
    openLogin: () => setLoginOpen(true),
    openRules: () => setRulesOpen(true)
  }), React.createElement("nav", {
    className: "tabs",
    "aria-label": "メニュー"
  }, React.createElement("div", {
    className: "inner"
  }, React.createElement("button", {
    className: tab === 'receive' ? 'on' : '',
    onClick: () => setTab('receive')
  }, React.createElement("svg", {
    className: "ico",
    viewBox: "0 0 24 24",
    "aria-hidden": "true"
  }, React.createElement("path", {
    d: "M4 5.5C6.5 4.5 9.5 4.5 12 6c2.5-1.5 5.5-1.5 8-.5v13c-2.5-1-5.5-1-8 .5-2.5-1.5-5.5-1.5-8-.5z"
  }), React.createElement("path", {
    d: "M12 6v13.5"
  })), React.createElement("span", {
    className: "lb"
  }, "受け取る")), React.createElement("button", {
    className: tab === 'create' ? 'on' : '',
    onClick: () => setTab('create')
  }, React.createElement("svg", {
    className: "ico",
    viewBox: "0 0 24 24",
    "aria-hidden": "true"
  }, React.createElement("path", {
    d: "M15.5 4.5l4 4L9 19l-5 1 1-5z"
  }), React.createElement("path", {
    d: "M13.5 6.5l4 4"
  })), React.createElement("span", {
    className: "lb"
  }, "流す")), React.createElement("button", {
    className: tab === 'me' ? 'on' : '',
    onClick: () => setTab('me')
  }, React.createElement("svg", {
    className: "ico",
    viewBox: "0 0 24 24",
    "aria-hidden": "true"
  }, React.createElement("circle", {
    cx: "12",
    cy: "8.5",
    r: "3.5"
  }), React.createElement("path", {
    d: "M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5"
  })), React.createElement("span", {
    className: "lb"
  }, "じぶん")))), loginOpen && React.createElement(Sheet, {
    onClose: () => setLoginOpen(false)
  }, React.createElement("h3", null, "ログイン"), React.createElement(LoginForm, {
    user: user,
    toast: toast
  })), rulesOpen && React.createElement(Rules, {
    onClose: () => setRulesOpen(false)
  }), React.createElement(Toast, {
    text: toastText
  }));
}
ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App, null));
})();
