document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const form = document.getElementById('searchForm');
    const coinSelect = document.getElementById('coinSelect');
    const priceButton = document.getElementById('priceButton');
    const priceTable = document.getElementById('priceTable').querySelector('tbody');
    const connectionStatus = document.getElementById('connectionStatus');
    const lastUpdate = document.getElementById('lastUpdate');
    
    // Coin to symbol mapping
    const coinSymbols = {
        'bitcoin': 'btcusdt',
        'ethereum': 'ethusdt',
        'solana': 'solusdt',
        'cardano': 'adausdt',
        'ripple': 'xrpusdt',
        'polkadot': 'dotusdt',
        'dogecoin': 'dogeusdt',
        'shiba-inu': 'shibusdt',
        'litecoin': 'ltcusdt',
        'chainlink': 'linkusdt'
    };

    // WebSocket Manager
    class BinanceWS {
        constructor() {
            this.socket = null;
            this.reconnectAttempts = 0;
            this.maxReconnectAttempts = 5;
            this.reconnectDelay = 3000;
            this.currentCoin = null;
        }

        connect(coin, onUpdate) {
            this.currentCoin = coin;
            const symbol = coinSymbols[coin];
            if (!symbol) return;

            if (this.socket) this.disconnect();

            this.socket = new WebSocket(`wss://stream.binance.com:9443/ws/${symbol}@ticker`);

            this.socket.onopen = () => {
                this.reconnectAttempts = 0;
                updateConnectionStatus('Live', 'bg-connected');
            };

            this.socket.onmessage = (event) => {
                const data = JSON.parse(event.data);
                onUpdate(coin, data);
            };

            this.socket.onerror = (error) => {
                console.error('WebSocket error:', error);
                updateConnectionStatus('Error', 'bg-disconnected');
                this.attemptReconnect(onUpdate);
            };

            this.socket.onclose = () => {
                if (this.reconnectAttempts < this.maxReconnectAttempts) {
                    this.attemptReconnect(onUpdate);
                } else {
                    updateConnectionStatus('Disconnected', 'bg-disconnected');
                }
            };
        }

        attemptReconnect(onUpdate) {
            this.reconnectAttempts++;
            updateConnectionStatus(`Reconnecting (${this.reconnectAttempts}/${this.maxReconnectAttempts})`, 'bg-reconnecting');
            
            setTimeout(() => {
                if (this.currentCoin) {
                    this.connect(this.currentCoin, onUpdate);
                }
            }, this.reconnectDelay);
        }

        disconnect() {
            if (this.socket) {
                this.socket.close();
                this.socket = null;
            }
        }
    }

    // Initialize WebSocket manager
    const binanceWS = new BinanceWS();

    // Enable/disable button based on selection
    coinSelect.addEventListener('change', (e) => {
        priceButton.disabled = !e.target.value;
    });

    // Form submission handler
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const selectedCoin = coinSelect.value;
        
        if (!selectedCoin) {
            alert('Please select a cryptocurrency');
            return;
        }
        
        // Preserve selection in dropdown
        coinSelect.value = selectedCoin;
        
        binanceWS.connect(selectedCoin, (coin, data) => {
            updatePriceTable(coin, data);
        });
    });

    // Update price table
    function updatePriceTable(coin, data) {
        const currentTime = new Date().toLocaleTimeString();
        const priceChange = parseFloat(data.P);
        const changeClass = priceChange < 0 ? 'text-danger' : 'text-success';
        
        priceTable.innerHTML = `
            <tr class="price-update">
                <td>Coin:</td>
                <td>${coin.charAt(0).toUpperCase() + coin.slice(1)} (${coinSymbols[coin].toUpperCase().replace('USDT', '')})</td>
            </tr>
            <tr class="price-update">
                <td>Current Price:</td>
                <td class="fw-bold">$${parseFloat(data.c).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            </tr>
            <tr>
                <td>24h Change:</td>
                <td class="${changeClass}">${priceChange.toFixed(2)}%</td>
            </tr>
            <tr>
                <td>24h High:</td>
                <td>$${parseFloat(data.h).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            </tr>
            <tr>
                <td>24h Low:</td>
                <td>$${parseFloat(data.l).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            </tr>
            <tr>
                <td>Last Update:</td>
                <td>${currentTime}</td>
            </tr>
        `;
        
        lastUpdate.textContent = `Last update: ${currentTime}`;
    }

    // Update connection status
    function updateConnectionStatus(text, cssClass) {
        connectionStatus.textContent = text;
        connectionStatus.className = `badge ${cssClass}`;
    }

    // Handle page visibility changes
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && coinSelect.value) {
            binanceWS.connect(coinSelect.value, updatePriceTable);
        }
    });
});