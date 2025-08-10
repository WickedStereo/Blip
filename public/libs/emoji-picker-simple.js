// Simple emoji picker implementation for Blip
(function(global) {
    'use strict';

    // Common emojis organized by category
    const EMOJI_DATA = {
        'smileys': {
            name: 'Smileys & People',
            icon: '😀',
            emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐', '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕']
        },
        'nature': {
            name: 'Animals & Nature',
            icon: '🐶',
            emojis: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐽', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒', '🐔', '🐧', '🐦', '🐤', '🐣', '🐥', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐜', '🦟', '🦗', '🕷️', '🕸️', '🦂', '🐢', '🐍', '🦎', '🦖', '🦕', '🐙', '🦑', '🦐', '🦞', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳', '🐋', '🦈', '🐊', '🐅', '🐆', '🦓', '🦍', '🦧', '🐘', '🦛', '🦏', '🐪', '🐫', '🦒', '🦘', '🐃', '🐂', '🐄', '🐎', '🐖', '🐏', '🐑', '🦙', '🐐', '🦌', '🐕', '🐩', '🦮', '🐕‍🦺', '🐈', '🐓', '🦃', '🦚', '🦜', '🦢', '🦩', '🕊️', '🐇', '🦝', '🦨', '🦡', '🦦', '🦥', '🐁', '🐀', '🐿️', '🦔']
        },
        'food': {
            name: 'Food & Drink',
            icon: '🍎',
            emojis: ['🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥬', '🥒', '🌶️', '🫑', '🌽', '🥕', '🫒', '🧄', '🧅', '🥔', '🍠', '🥐', '🥯', '🍞', '🥖', '🥨', '🧀', '🥚', '🍳', '🧈', '🥞', '🧇', '🥓', '🥩', '🍗', '🍖', '🦴', '🌭', '🍔', '🍟', '🍕', '🫓', '🥪', '🥙', '🧆', '🌮', '🌯', '🫔', '🥗', '🥘', '🫕', '🥫', '🍝', '🍜', '🍲', '🍛', '🍣', '🍱', '🥟', '🦪', '🍤', '🍙', '🍚', '🍘', '🍥', '🥠', '🥮', '🍢', '🍡', '🍧', '🍨', '🍦', '🥧', '🧁', '🍰', '🎂', '🍮', '🍭', '🍬', '🍫', '🍿', '🍩', '🍪', '🌰', '🥜', '🍯', '🥛', '🍼', '☕', '🫖', '🍵', '🧃', '🥤', '🧋', '🍶', '🍺', '🍻', '🥂', '🍷', '🥃', '🍸', '🍹', '🧉', '🍾']
        },
        'activities': {
            name: 'Activities',
            icon: '⚽',
            emojis: ['⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🪀', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🪃', '🥅', '⛳', '🪁', '🏹', '🎣', '🤿', '🥊', '🥋', '🎽', '🛹', '🛷', '⛸️', '🥌', '🎿', '⛷️', '🏂', '🪂', '🏋️‍♀️', '🏋️', '🏋️‍♂️', '🤼‍♀️', '🤼', '🤼‍♂️', '🤸‍♀️', '🤸', '🤸‍♂️', '⛹️‍♀️', '⛹️', '⛹️‍♂️', '🤺', '🤾‍♀️', '🤾', '🤾‍♂️', '🏌️‍♀️', '🏌️', '🏌️‍♂️', '🏇', '🧘‍♀️', '🧘', '🧘‍♂️', '🏄‍♀️', '🏄', '🏄‍♂️', '🏊‍♀️', '🏊', '🏊‍♂️', '🤽‍♀️', '🤽', '🤽‍♂️', '🚣‍♀️', '🚣', '🚣‍♂️', '🧗‍♀️', '🧗', '🧗‍♂️', '🚵‍♀️', '🚵', '🚵‍♂️', '🚴‍♀️', '🚴', '🚴‍♂️']
        },
        'travel': {
            name: 'Travel & Places',
            icon: '🚗',
            emojis: ['🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐', '🛻', '🚚', '🚛', '🚜', '🏍️', '🛵', '🚲', '🛴', '🛹', '🛼', '🚁', '🚟', '🚠', '🚡', '🛰️', '🚀', '🛸', '🛶', '⛵', '🚤', '🛥️', '🛳️', '⛴️', '🚢', '⚓', '⛽', '🚧', '🚨', '🚥', '🚦', '🛑', '🚏', '🗺️', '🗿', '🗽', '🗼', '🏰', '🏯', '🏟️', '🎡', '🎢', '🎠', '⛲', '⛱️', '🏖️', '🏝️', '🏜️', '🌋', '⛰️', '🏔️', '🗻', '🏕️', '⛺', '🛖', '🏠', '🏡', '🏘️', '🏚️', '🏗️', '🏭', '🏢', '🏬', '🏣', '🏤', '🏥', '🏦', '🏨', '🏪', '🏫', '🏩', '💒', '🏛️', '⛪', '🕌', '🛕', '🕍', '🕋']
        },
        'objects': {
            name: 'Objects',
            icon: '⌚',
            emojis: ['⌚', '📱', '📲', '💻', '⌨️', '🖥️', '🖨️', '🖱️', '🖲️', '🕹️', '🗜️', '💽', '💾', '💿', '📀', '📼', '📷', '📸', '📹', '🎥', '📽️', '🎞️', '📞', '☎️', '📟', '📠', '📺', '📻', '🎙️', '🎚️', '🎛️', '🧭', '⏱️', '⏲️', '⏰', '🕰️', '⏳', '⌛', '📡', '🔋', '🔌', '💡', '🔦', '🕯️', '🪔', '🧯', '🛢️', '💸', '💵', '💴', '💶', '💷', '🪙', '💰', '💳', '💎', '⚖️', '🪜', '🧰', '🔧', '🔨', '⚒️', '🛠️', '⛏️', '🔩', '⚙️', '🪚', '🔫', '🧨', '💣', '🔪', '🗡️', '⚔️', '🛡️', '🚬', '⚰️', '🪦', '⚱️', '🏺', '🔮', '📿', '🧿', '💈', '⚗️', '🔭', '🔬', '🕳️', '🩹', '🩺', '💊', '💉', '🩸', '🧬', '🦠', '🧫', '🧪', '🌡️', '🧹', '🧺', '🧻', '🚽', '🚰', '🚿', '🛁', '🛀', '🧼', '🪥', '🪒', '🧽', '🪣', '🧴', '🛎️', '🔑', '🗝️', '🚪', '🪑', '🛏️', '🛋️', '🪞', '🪟', '🧳', '🛍️', '🎁', '🎀', '🎊', '🎉', '🧨']
        },
        'symbols': {
            name: 'Symbols',
            icon: '❤️',
            emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉️', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐', '⛎', '♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓', '🆔', '⚛️', '🉑', '☢️', '☣️', '📴', '📳', '🈶', '🈚', '🈸', '🈺', '🈷️', '✴️', '🆚', '💮', '🉐', '㊙️', '㊗️', '🈴', '🈵', '🈹', '🈲', '🅰️', '🅱️', '🆎', '🆑', '🅾️', '🆘', '❌', '⭕', '🛑', '⛔', '📛', '🚫', '💯', '💢', '♨️', '🚷', '🚯', '🚳', '🚱', '🔞', '📵', '🚭', '❗', '❕', '❓', '❔', '‼️', '⁉️', '🔅', '🔆', '〽️', '⚠️', '🚸', '🔱', '⚜️', '🔰', '♻️', '✅', '🈯', '💹', '❇️', '✳️', '❎', '🌐', '💠', 'Ⓜ️', '🌀', '💤', '🏧', '🚾', '♿', '🅿️', '🈳', '🈂️', '🛂', '🛃', '🛄', '🛅', '🚹', '🚺', '🚼', '🚻', '🚮', '🎦', '📶', '🈁', '🔣', 'ℹ️', '🔤', '🔡', '🔠', '🆖', '🆗', '🆙', '🆒', '🆕', '🆓', '0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟']
        }
    };

    class SimpleEmojiPicker extends HTMLElement {
        constructor() {
            super();
            this.attachShadow({ mode: 'open' });
            this.currentCategory = 'smileys';
            this.render();
            this.setupEventListeners();
        }

        render() {
            this.shadowRoot.innerHTML = `
                <style>
                    :host {
                        display: block;
                        width: 320px;
                        height: 350px;
                        border: 1px solid var(--border-color, #e2e8f0);
                        border-radius: 1rem;
                        background: var(--bg-primary, white);
                        box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
                        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        color: var(--text-primary, #1e293b);
                        z-index: 1000;
                    }
                    
                    .emoji-picker {
                        height: 100%;
                        display: flex;
                        flex-direction: column;
                    }
                    
                    .categories {
                        display: flex;
                        border-bottom: 1px solid var(--border-color, #e2e8f0);
                        background: var(--bg-tertiary, #f1f5f9);
                        padding: 12px;
                        gap: 6px;
                        border-radius: 1rem 1rem 0 0;
                    }
                    
                    .category-btn {
                        background: none;
                        border: none;
                        padding: 10px;
                        border-radius: 0.75rem;
                        cursor: pointer;
                        font-size: 20px;
                        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                        min-width: 40px;
                        min-height: 40px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    }
                    
                    .category-btn:hover {
                        background: var(--bg-primary, #ffffff);
                        transform: translateY(-1px);
                        box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
                    }
                    
                    .category-btn.active {
                        background: var(--primary-color, #6366f1);
                        color: white;
                        transform: translateY(-1px);
                        box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
                    }
                    
                    .emoji-grid {
                        flex: 1;
                        padding: 16px;
                        overflow-y: auto;
                        display: grid;
                        grid-template-columns: repeat(8, 1fr);
                        gap: 6px;
                        align-content: start;
                    }
                    
                    .emoji-btn {
                        background: none;
                        border: none;
                        padding: 6px;
                        border-radius: 0.5rem;
                        cursor: pointer;
                        font-size: 22px;
                        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        height: 40px;
                        width: 40px;
                    }
                    
                    .emoji-btn:hover {
                        background: var(--bg-tertiary, #f1f5f9);
                        transform: scale(1.15);
                        box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
                    }
                    
                    .emoji-grid::-webkit-scrollbar {
                        width: 6px;
                    }
                    
                    .emoji-grid::-webkit-scrollbar-track {
                        background: transparent;
                    }
                    
                    .emoji-grid::-webkit-scrollbar-thumb {
                        background: var(--border-color, #e2e8f0);
                        border-radius: 3px;
                    }
                    
                    .emoji-grid::-webkit-scrollbar-thumb:hover {
                        background: var(--border-hover, #cbd5e1);
                    }
                </style>
                
                <div class="emoji-picker">
                    <div class="categories">
                        ${Object.keys(EMOJI_DATA).map(key => `
                            <button class="category-btn ${key === this.currentCategory ? 'active' : ''}" 
                                    data-category="${key}" 
                                    title="${EMOJI_DATA[key].name}">
                                ${EMOJI_DATA[key].icon}
                            </button>
                        `).join('')}
                    </div>
                    <div class="emoji-grid">
                        ${this.renderEmojis()}
                    </div>
                </div>
            `;
        }

        renderEmojis() {
            const categoryData = EMOJI_DATA[this.currentCategory];
            return categoryData.emojis.map(emoji => `
                <button class="emoji-btn" data-emoji="${emoji}">${emoji}</button>
            `).join('');
        }

        setupEventListeners() {
            this.shadowRoot.addEventListener('click', (e) => {
                if (e.target.classList.contains('category-btn')) {
                    this.currentCategory = e.target.dataset.category;
                    this.updateActiveCategory();
                    this.updateEmojiGrid();
                } else if (e.target.classList.contains('emoji-btn')) {
                    const emoji = e.target.dataset.emoji;
                    this.dispatchEvent(new CustomEvent('emoji-click', {
                        detail: { emoji: { unicode: emoji } },
                        bubbles: true
                    }));
                }
            });
        }

        updateActiveCategory() {
            const categoryBtns = this.shadowRoot.querySelectorAll('.category-btn');
            categoryBtns.forEach(btn => {
                btn.classList.toggle('active', btn.dataset.category === this.currentCategory);
            });
        }

        updateEmojiGrid() {
            const emojiGrid = this.shadowRoot.querySelector('.emoji-grid');
            emojiGrid.innerHTML = this.renderEmojis();
        }
    }

    // Register the custom element
    if (!customElements.get('emoji-picker')) {
        customElements.define('emoji-picker', SimpleEmojiPicker);
    }

    // Export for potential module usage
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = SimpleEmojiPicker;
    } else if (typeof define === 'function' && define.amd) {
        define(function() { return SimpleEmojiPicker; });
    } else {
        global.SimpleEmojiPicker = SimpleEmojiPicker;
    }

})(typeof window !== 'undefined' ? window : this);
