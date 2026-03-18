document.getElementById('fileInput').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) {
        document.getElementById('somaOriginal').value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = function(evt) {
        const text = evt.target.result;
        const lines = text.split(/\r?\n/);
        let soma = 0;
        
        for (let i = 0; i < lines.length; i++) {
            let linha = lines[i];
        
            if (linha.startsWith("74") && linha.length >= 50) {
                let valorOriginalStr = linha.substring(37, 50);
                soma += parseInt(valorOriginalStr, 10) / 100;
            }
        }
        
        document.getElementById('somaOriginal').value = soma.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };
    reader.readAsText(file);
});

document.getElementById('somaDesejada').addEventListener('input', function(e) {
    let valor = e.target.value.replace(/\D/g, ''); 
    if (valor === '') {
        e.target.value = '';
        return;
    }
    valor = parseInt(valor, 10) / 100;
    e.target.value = valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
});

function processarArquivo() {
    const file = document.getElementById('fileInput').files[0];
    if (!file) {
        alert("Por favor, selecione um arquivo.");
        return;
    }

    const somaOriginalStr = document.getElementById('somaOriginal').value;
    const somaDesejadaStr = document.getElementById('somaDesejada').value;

    if (!somaOriginalStr || !somaDesejadaStr) {
        alert("Por favor, certifique-se de que o arquivo foi lido e preencha a soma desejada.");
        return;
    }

    function parseMoeda(str) {
        let numero = str.replace(/[^\d,]/g, '').replace(',', '.');
        return parseFloat(numero);
    }

    const somaOriginal = parseMoeda(somaOriginalStr);
    const somaDesejada = parseMoeda(somaDesejadaStr);

    if (somaOriginal === 0) {
        alert("A soma original é zero. Não é possível calcular a proporção de ajuste.");
        return;
    }

    const btn = document.querySelector('button');
    const textoOriginalBtn = btn.innerText;
    btn.innerText = "Processando...";
    btn.disabled = true;

    const reader = new FileReader();
    reader.onload = function(e) {
        const text = e.target.result;
        const isCRLF = text.includes('\r\n');
        const lines = text.split(/\r?\n/);
        
        let somaOriginalInt = 0;
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].startsWith("74") && lines[i].length >= 50) {
                somaOriginalInt += parseInt(lines[i].substring(37, 50), 10);
            }
        }

        const somaDesejadaInt = Math.round(somaDesejada * 100);
        let somaAcumuladaOriginal = 0;
        let somaAcumuladaDesejada = 0;

        let outputLines = [];

        for (let i = 0; i < lines.length; i++) {
            let linha = lines[i];
            
            if (linha.startsWith("74") && linha.length >= 50) {
                let prefixo = linha.substring(0, 37);
                let valorOriginalStr = linha.substring(37, 50);
                let sufixo = linha.substring(50);

                let valorOriginalInt = parseInt(valorOriginalStr, 10);
                somaAcumuladaOriginal += valorOriginalInt;
                
                let somaAcumuladaIdeal = Math.round((somaAcumuladaOriginal / somaOriginalInt) * somaDesejadaInt);
                let novoValorInt = somaAcumuladaIdeal - somaAcumuladaDesejada;
                
                somaAcumuladaDesejada += novoValorInt;
                let novoValorStr = novoValorInt.toString().padStart(13, '0');
                
                linha = prefixo + novoValorStr + sufixo;
            }
            
            outputLines.push(linha);
        }

        const novoConteudo = outputLines.join(isCRLF ? '\r\n' : '\n');
        const blob = new Blob([novoConteudo], { type: "text/plain" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "sintegra_corrigido.txt";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        btn.innerText = textoOriginalBtn;
        btn.disabled = false;
    };
    
    reader.readAsText(file);
}