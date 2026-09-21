import type { Book, BilingualParagraph } from '../types/reader';
import { uid } from './helpers';

export function createSampleAcademicPaper(): Book {
  const paperMd = `# Attention Is All You Need

**Ashish Vaswani, Noam Shazeer, Niki Parmar, Jakob Uszkoreit, Llion Jones, Aidan N. Gomez, Łukasz Kaiser, Illia Polosukhin**
*Google Brain, Google Research, University of Toronto*

---

## Abstract
The dominant sequence transduction models are based on complex recurrent or convolutional neural networks that include an encoder and a decoder. The best performing models also connect the encoder and decoder through an attention mechanism.

We propose a new simple network architecture, the **Transformer**, based solely on attention mechanisms, dispensing with recurrence and convolutions entirely. Experiments on two machine translation tasks show these models to be superior in quality while being more parallelizable and requiring significantly less time to train.

---

## 1. Introduction
Recurrent neural networks, particularly long short-term memory (LSTM) and gated recurrent (GRU) neural networks, have been firmly established as state of the art approaches in sequence modeling and transduction problems such as language modeling and machine translation.

Recurrent models typically factor computation along the symbol positions of the input and output sequences. Aligning the positions to steps in computation time, they generate a sequence of hidden states $h_t$, as a function of the previous hidden state $h_{t-1}$ and the input for position $t$.

This inherently sequential nature precludes parallelization within training examples, which becomes critical at longer sequence lengths, as memory constraints limit batching across examples.

---

## 2. Model Architecture
Most competitive neural sequence transduction models have an encoder-decoder structure. Here, the encoder maps an input sequence of symbol representations $(x_1, \\dots, x_n)$ to a sequence of continuous representations $\\mathbf{z} = (z_1, \\dots, z_n)$. Given $\\mathbf{z}$, the decoder then generates an output sequence $(y_1, \\dots, y_m)$ of symbols one element at a time. At each step the model is auto-regressive, consuming the previously generated symbols as additional input when generating the next.

The Transformer follows this overall architecture using stacked self-attention and point-wise, fully connected layers for both the encoder and decoder.

---

## 3. Attention Mechanisms

An attention function can be described as mapping a query and a set of key-value pairs to an output, where the query, keys, values, and output are all vectors. The output is computed as a weighted sum of the values, where the weight assigned to each value is computed by a compatibility function of the query with the corresponding key.

### 3.1 Scaled Dot-Product Attention
We call our particular attention **Scaled Dot-Product Attention**. The input consists of queries and keys of dimension $d_k$, and values of dimension $d_v$. We compute the dot products of the query with all keys, divide each by $\\sqrt{d_k}$, and apply a softmax function to obtain the weights on the values.

In practice, we compute the attention function on a set of queries simultaneously, packed together into a matrix $Q$. The keys and values are also packed into matrices $K$ and $V$. We compute the matrix of outputs as:

$$\\text{Attention}(Q, K, V) = \\text{softmax}\\left(\\frac{QK^T}{\\sqrt{d_k}}\\right)V$$

The two most commonly used attention functions are additive attention, and dot-product (multiplicative) attention. Dot-product attention is identical to our algorithm, except for the scaling factor of $\\frac{1}{\\sqrt{d_k}}$.

### 3.2 Multi-Head Attention
Instead of performing a single attention function with $d_{\\text{model}}$-dimensional queries, keys and values, we found it beneficial to linearly project the queries, keys and values $h$ times with different, learned linear projections to $d_k, d_k$ and $d_v$ dimensions, respectively.

$$\\text{MultiHead}(Q, K, V) = \\text{Concat}(\\text{head}_1, \\dots, \\text{head}_h)W^O$$

$$\\text{where}\\quad \\text{head}_i = \\text{Attention}(QW_i^Q, KW_i^K, VW_i^V)$$

Where the projections are parameter matrices:
$$W_i^Q \\in \\mathbb{R}^{d_{\\text{model}} \\times d_k}, \\quad W_i^K \\in \\mathbb{R}^{d_{\\text{model}} \\times d_k}, \\quad W_i^V \\in \\mathbb{R}^{d_{\\text{model}} \\times d_v}$$
and $W^O \\in \\mathbb{R}^{h d_v \\times d_{\\text{model}}}$.

Multi-head attention allows the model to jointly attend to information from different representation subspaces at different positions.

---

## 4. Results on Machine Translation

On the WMT 2014 English-to-German translation task, the big transformer model achieves a state-of-the-art BLEU score of 28.4.

| Model | BLEU (EN-DE) | BLEU (EN-FR) | Training Cost (FLOPs) |
| :--- | :--- | :--- | :--- |
| ByteNet | 23.75 | - | - |
| GNMT + RL | 24.6 | 39.92 | $1.5 \\times 10^{20}$ |
| ConvS2S | 25.16 | 40.46 | $9.6 \\times 10^{18}$ |
| **Transformer (base model)** | **27.3** | **38.1** | $\\mathbf{3.3 \\times 10^{18}}$ |
| **Transformer (big model)** | **28.4** | **41.8** | $\\mathbf{2.3 \\times 10^{19}}$ |

---

## 5. Conclusion
In this work, we presented the Transformer, the first sequence transduction model based entirely on attention, replacing the recurrent layers most commonly used in encoder-decoder architectures with multi-headed self-attention.

For translation tasks, the Transformer can be trained significantly faster than architectures based on recurrent or convolutional layers. On both WMT 2014 English-to-German and WMT 2014 English-to-French translation tasks, we achieve a new state of the art.
`;

  const sampleBilingualParas: BilingualParagraph[] = [
    {
      id: uid(),
      original:
        'The dominant sequence transduction models are based on complex recurrent or convolutional neural networks that include an encoder and a decoder. The best performing models also connect the encoder and decoder through an attention mechanism.',
      translation:
        '主流的序列转换模型均基于复杂的循环神经网络（RNN）或卷积神经网络（CNN），包含一个编码器和一个解码器。表现最佳的模型还会通过注意力机制将编码器与解码器连接起来。',
      status: 'done'
    },
    {
      id: uid(),
      original:
        'We propose a new simple network architecture, the Transformer, based solely on attention mechanisms, dispensing with recurrence and convolutions entirely.',
      translation:
        '我们提出了一种全新的简易网络架构——Transformer。该模型完全基于注意力机制构建，彻底摒弃了循环与卷积结构。',
      status: 'done'
    },
    {
      id: uid(),
      original:
        'Recurrent models typically factor computation along the symbol positions of the input and output sequences. Aligning the positions to steps in computation time, they generate a sequence of hidden states $h_t$, as a function of the previous hidden state $h_{t-1}$ and the input for position $t$.',
      translation:
        '循环模型通常沿着输入与输出序列的符号位置分解计算过程。通过将位置与计算时间步对齐，它们生成隐状态序列 $h_t$（由前一隐状态 $h_{t-1}$ 与当前输入 $t$ 计算而来）。',
      status: 'done'
    },
    {
      id: uid(),
      original:
        'We compute the matrix of outputs as:\n\n$$\\text{Attention}(Q, K, V) = \\text{softmax}\\left(\\frac{QK^T}{\\sqrt{d_k}}\\right)V$$\n\nThe two most commonly used attention functions are additive attention, and dot-product (multiplicative) attention.',
      translation:
        '我们计算输出矩阵如下：\n\n$$\\text{Attention}(Q, K, V) = \\text{softmax}\\left(\\frac{QK^T}{\\sqrt{d_k}}\\right)V$$\n\n最常用的两种注意力函数是加法注意力和点积（乘法）注意力。',
      status: 'done'
    },
    {
      id: uid(),
      original:
        'Multi-head attention allows the model to jointly attend to information from different representation subspaces at different positions.\n\n$$\\text{MultiHead}(Q, K, V) = \\text{Concat}(\\text{head}_1, \\dots, \\text{head}_h)W^O$$',
      translation:
        '多头注意力机制允许模型在不同位置共同关注来自不同表征子空间的信息：\n\n$$\\text{MultiHead}(Q, K, V) = \\text{Concat}(\\text{head}_1, \\dots, \\text{head}_h)W^O$$',
      status: 'done'
    }
  ];

  return {
    id: 'sample-transformer-paper',
    title: 'Attention Is All You Need (Transformer 原文精读)',
    author: 'Ashish Vaswani, Noam Shazeer, et al.',
    ext: 'pdf',
    kind: 'pdf',
    size: 2215040,
    pageCount: 15,
    cover: null,
    toc: [
      { id: 'sec-abs', label: 'Abstract', level: 1, kind: 'chapter', index: 0, chapterIndex: 0 },
      { id: 'sec-1', label: '1. Introduction', level: 1, kind: 'chapter', index: 1, chapterIndex: 1 },
      { id: 'sec-2', label: '2. Model Architecture', level: 1, kind: 'chapter', index: 2, chapterIndex: 2 },
      { id: 'sec-3', label: '3. Attention Mechanisms', level: 1, kind: 'chapter', index: 3, chapterIndex: 3 },
      { id: 'sec-4', label: '4. Results on Machine Translation', level: 1, kind: 'chapter', index: 4, chapterIndex: 4 },
      { id: 'sec-5', label: '5. Conclusion', level: 1, kind: 'chapter', index: 5, chapterIndex: 5 }
    ],
    curTocId: 'sec-abs',
    annotations: [
      {
        id: 'ann-1',
        color: 'yellow',
        text: 'We propose a new simple network architecture, the Transformer, based solely on attention mechanisms, dispensing with recurrence and convolutions entirely.',
        note: 'Transformer 的核心主旨：抛弃 RNN/CNN 的固有序列约束，完全依靠自注意力，极大提升并行训练吞吐量。',
        at: Date.now() - 3600000 * 2,
        locationLabel: '第 1 页 · 摘要',
        kind: 'pdf',
        page: 1,
        index: 0
      },
      {
        id: 'ann-2',
        color: 'green',
        text: '$$\\text{Attention}(Q, K, V) = \\text{softmax}\\left(\\frac{QK^T}{\\sqrt{d_k}}\\right)V$$',
        note: '除以根号 dk 是为了防止点积数值过大导致 Softmax 梯度饱和进入极平缓区。',
        at: Date.now() - 3600000,
        locationLabel: '第 4 页 · 3.1 节',
        kind: 'pdf',
        page: 4,
        index: 3
      }
    ],
    marks: [
      {
        id: 'mark-1',
        label: '3. Attention Mechanisms (核心公式推导)',
        locationLabel: '第 4 页',
        page: 4,
        index: 3,
        kind: 'pdf'
      }
    ],
    vocabs: [
      {
        id: 'v-1',
        word: 'transduction',
        note: '转换、转导（在 NLP 中常指从一种形式序列转化为另一种序列）',
        at: Date.now() - 3600000,
        locationLabel: '第 1 页'
      },
      {
        id: 'v-2',
        word: 'autoregressive',
        note: '自回归的（下一步预测依赖前几步已生成的输出）',
        at: Date.now() - 1800000,
        locationLabel: '第 2 页'
      }
    ],
    progress: 0.35,
    locationLabel: '第 4 / 15 页',
    addedAt: Date.now() - 86400000,
    lastReadAt: Date.now() - 600000,
    textModeActive: true,
    textMarkdown: paperMd,
    bilingualActive: false,
    bilingualParas: sampleBilingualParas,
    mineruStatus: 'done',
    fileData: createSamplePdfBinary()
  };
}

export function createSamplePdfBinary(): ArrayBuffer {
  const pdfString = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R 4 0 R 5 0 R] /Count 3 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 6 0 R >> >> /Contents 7 0 R >>
endobj
4 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 6 0 R >> >> /Contents 8 0 R >>
endobj
5 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 6 0 R >> >> /Contents 9 0 R >>
endobj
6 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
7 0 obj
<< /Length 260 >>
stream
BT
/F1 22 Tf
50 780 Td
(Attention Is All You Need) Tj
/F1 11 Tf
0 -30 Td
(Ashish Vaswani, Noam Shazeer, Niki Parmar, et al. - Google Brain) Tj
0 -40 Td
(Abstract: The dominant sequence transduction models are based on complex) Tj
0 -20 Td
(recurrent or convolutional neural networks. We propose the Transformer.) Tj
0 -40 Td
(1. Introduction) Tj
0 -20 Td
(Recurrent neural networks have been firmly established as state of the art.) Tj
ET
endstream
endobj
8 0 obj
<< /Length 260 >>
stream
BT
/F1 16 Tf
50 780 Td
(3. Attention Mechanism) Tj
/F1 11 Tf
0 -30 Td
(An attention function can be described as mapping a query and a set of) Tj
0 -20 Td
(key-value pairs to an output.) Tj
0 -30 Td
(Attention(Q, K, V) = softmax( Q K^T / sqrt(d_k) ) V) Tj
0 -40 Td
(Multi-Head Attention allows the model to jointly attend to information) Tj
0 -20 Td
(from different representation subspaces at different positions.) Tj
ET
endstream
endobj
9 0 obj
<< /Length 220 >>
stream
BT
/F1 16 Tf
50 780 Td
(5. Conclusion) Tj
/F1 11 Tf
0 -30 Td
(In this work, we presented the Transformer, the first sequence) Tj
0 -20 Td
(transduction model based entirely on attention.) Tj
0 -40 Td
(We are excited about the future of attention-based models and plan) Tj
0 -20 Td
(to apply them to other tasks.) Tj
ET
endstream
endobj
xref
0 10
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000133 00000 n 
0000000257 00000 n 
0000000381 00000 n 
0000000505 00000 n 
0000000572 00000 n 
0000000885 00000 n 
0000001198 00000 n 
trailer
<< /Size 10 /Root 1 0 R >>
startxref
1471
%%EOF`;
  const buf = new Uint8Array(pdfString.length);
  for (let i = 0; i < pdfString.length; i++) {
    buf[i] = pdfString.charCodeAt(i);
  }
  return buf.buffer;
}
