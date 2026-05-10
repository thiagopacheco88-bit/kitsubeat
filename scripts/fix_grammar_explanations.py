"""
Fix grammar_points[*].explanation: convert plain English strings
to trilingual {"en": ..., "pt-BR": ..., "es": ...} objects.
"""
import json, os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE_DIR = os.path.join(BASE_DIR, "data", "lessons-cache")

TRANSLATIONS = {
"pino-to-amelie-huwie-ishizaki": [
    {
        "en": "Combines the te-form of a verb + くれる (to give/do for me) + ないか (negative question) to create a soft but earnest request. Used when asking someone to do a favor that benefits the speaker.",
        "pt-BR": "Combina a forma-te de um verbo + くれる (dar/fazer por mim) + ないか (pergunta negativa) para criar um pedido suave, mas sincero. Usado quando se pede a alguém um favor que beneficia o falante.",
        "es": "Combina la forma-te de un verbo + くれる (dar/hacer por mí) + ないか (pregunta negativa) para crear una solicitud suave pero sincera. Se usa cuando se pide a alguien un favor que beneficia al hablante."
    },
    {
        "en": "の/ん + だ attaches to plain-form verbs and adjectives to add an explanatory or emotional nuance, as if sharing something you want the listener to understand or feel.",
        "pt-BR": "の/ん + だ se anexa a verbos e adjetivos na forma simples para adicionar uma nuance explicativa ou emocional, como se compartilhasse algo que você quer que o ouvinte entenda ou sinta.",
        "es": "の/ん + だ se adjunta a verbos y adjetivos en forma simple para añadir un matiz explicativo o emocional, como si compartiera algo que quiere que el oyente entienda o sienta."
    },
    {
        "en": "みたい (resemblance auxiliary) + に (adverbializer) creates a simile meaning 'like' or 'similar to'. More colloquial than ように.",
        "pt-BR": "みたい (auxiliar de semelhança) + に (adverbializador) cria uma comparação com o significado de 'como' ou 'parecido com'. Mais coloquial do que ように.",
        "es": "みたい (auxiliar de semejanza) + に (adverbializador) crea un símil que significa 'como' o 'similar a'. Más coloquial que ように."
    },
    {
        "en": "よう attached to a verb expresses purpose or manner. With ぬ (classical negative) it means 'so as not to ~', giving a literary, poetic tone.",
        "pt-BR": "よう anexado a um verbo expressa propósito ou modo. Com ぬ (negativa clássica) significa 'de modo a não ~', dando um tom literário e poético.",
        "es": "よう adjunto a un verbo expresa propósito o modo. Con ぬ (negativo clásico) significa 'de modo que no ~', dando un tono literario y poético."
    },
    {
        "en": "気 (feeling/sense) + が + する (to do/happen) creates the expression 'I have a feeling that ~', expressing a subjective impression or hunch.",
        "pt-BR": "気 (sentimento/sensação) + が + する (fazer/acontecer) cria a expressão 'tenho a sensação de que ~', expressando uma impressão subjetiva ou intuição.",
        "es": "気 (sentimiento/sensación) + が + する (hacer/suceder) crea la expresión 'tengo la sensación de que ~', expresando una impresión subjetiva o corazonada."
    },
    {
        "en": "てしまう expresses an action completed (often regrettably or completely). In the classical/poetic form ぬ negates it: しまわぬ = will not end up happening.",
        "pt-BR": "てしまう expressa uma ação concluída (frequentemente com arrependimento ou completamente). Na forma clássica/poética, ぬ a nega: しまわぬ = não acabará acontecendo.",
        "es": "てしまう expresa una acción completada (a menudo con pesar o de manera completa). En la forma clásica/poética ぬ la niega: しまわぬ = no acabará sucediendo."
    }
],
"never-give-up-watanabe-misato": [
    {
        "en": "だから or 〜からだ is used to give a reason or cause. When placed at the end of a statement, it explains why something is the case.",
        "pt-BR": "だから ou 〜からだ é usado para dar uma razão ou causa. Quando colocado no final de uma afirmação, explica por que algo é assim.",
        "es": "だから o 〜からだ se usa para dar una razón o causa. Cuando se coloca al final de una afirmación, explica por qué algo es así."
    },
    {
        "en": "The negative te-form (ないで) can mean 'without doing ~' or function as a soft negative command 'please don't ~'. Very common in emotional speech.",
        "pt-BR": "A forma-te negativa (ないで) pode significar 'sem fazer ~' ou funcionar como um comando negativo suave 'por favor, não ~'. Muito comum na fala emocional.",
        "es": "La forma-te negativa (ないで) puede significar 'sin hacer ~' o funcionar como un mandato negativo suave 'por favor no ~'. Muy común en el habla emocional."
    },
    {
        "en": "わけ (meaning/reason) + じゃない (is not) negates an implication. Used to clarify that a natural inference is incorrect: 'just because X doesn't mean Y'.",
        "pt-BR": "わけ (significado/razão) + じゃない (não é) nega uma implicação. Usado para esclarecer que uma inferência natural está incorreta: 'só porque X não significa Y'.",
        "es": "わけ (significado/razón) + じゃない (no es) niega una implicación. Se usa para aclarar que una inferencia natural es incorrecta: 'solo porque X no significa Y'."
    },
    {
        "en": "i-adjective adverb form (〜く) + なる = 'to become [adjective]'. One of the most fundamental patterns for expressing change of state.",
        "pt-BR": "Forma adverbial do adjetivo-i (〜く) + なる = 'tornar-se [adjetivo]'. Um dos padrões mais fundamentais para expressar mudança de estado.",
        "es": "Forma adverbial del adjetivo-i (〜く) + なる = 'volverse [adjetivo]'. Uno de los patrones más fundamentales para expresar un cambio de estado."
    }
],
"ikiru-j-j-y": [
    {
        "en": "This set expression means to make something/someone work in your favor. 味方 (ally) + につける (to attach to oneself) = to turn something into an ally or advantage.",
        "pt-BR": "Esta expressão fixa significa fazer algo/alguém trabalhar a seu favor. 味方 (aliado) + につける (anexar a si mesmo) = transformar algo em um aliado ou vantagem.",
        "es": "Esta expresión fija significa hacer que algo/alguien trabaje a tu favor. 味方 (aliado) + につける (adjuntar a uno mismo) = convertir algo en un aliado o ventaja."
    },
    {
        "en": "の/ん + だから gives an explanatory or persuasive reason. More emphatic than から alone — the speaker is explaining something obvious or emotionally important.",
        "pt-BR": "の/ん + だから fornece uma razão explicativa ou persuasiva. Mais enfático do que から sozinho — o falante está explicando algo óbvio ou emocionalmente importante.",
        "es": "の/ん + だから da una razón explicativa o persuasiva. Más enfático que から solo — el hablante está explicando algo obvio o emocionalmente importante."
    },
    {
        "en": "て-form + たら is the conditional 'if/when'. ~してたら is a contracted form of ~していたら, meaning 'if I (continue to) do ~'.",
        "pt-BR": "Forma-te + たら é o condicional 'se/quando'. ~してたら é uma forma contraída de ~していたら, significando 'se eu (continuar a) fazer ~'.",
        "es": "Forma-te + たら es el condicional 'si/cuando'. ~してたら es una forma contraída de ~していたら, que significa 'si (continúo) haciendo ~'."
    },
    {
        "en": "Verb negative stem + なくなる means 'to come to no longer do something' or 'to cease to be'. Expresses a change from a state of doing to not doing.",
        "pt-BR": "Radical negativo do verbo + なくなる significa 'passar a não fazer mais algo' ou 'deixar de ser'. Expressa uma mudança de um estado de ação para um de não ação.",
        "es": "Raíz negativa del verbo + なくなる significa 'llegar a no hacer algo más' o 'dejar de ser'. Expresa un cambio de un estado de acción a uno de inacción."
    }
],
"we-go-hiroshi-kitadani": [
    {
        "en": "The volitional form (〜よう for group 2 verbs, 〜おう for group 1) expresses the speaker's will or an invitation to do something together. 揚げよう = 'let's raise!'",
        "pt-BR": "A forma volitiva (〜よう para verbos do grupo 2, 〜おう para o grupo 1) expressa a vontade do falante ou um convite para fazer algo juntos. 揚げよう = 'vamos erguer!'",
        "es": "La forma volitiva (〜よう para verbos del grupo 2, 〜おう para el grupo 1) expresa la voluntad del hablante o una invitación a hacer algo juntos. 揚げよう = '¡vamos a elevar!'"
    },
    {
        "en": "なら is a conditional particle meaning 'if' or 'given that', often used when the condition is assumed to be true based on context. More about the implication than the action.",
        "pt-BR": "なら é uma partícula condicional que significa 'se' ou 'dado que', frequentemente usada quando a condição é considerada verdadeira com base no contexto. Mais sobre a implicação do que sobre a ação.",
        "es": "なら es una partícula condicional que significa 'si' o 'dado que', frecuentemente usada cuando la condición se asume verdadera según el contexto. Se centra más en la implicación que en la acción."
    },
    {
        "en": "だけ (only) + が (subject particle) emphasizes exclusivity. 自由だけが = 'only freedom' as the subject.",
        "pt-BR": "だけ (somente) + が (partícula de sujeito) enfatiza exclusividade. 自由だけが = 'somente a liberdade' como sujeito.",
        "es": "だけ (solo) + が (partícula de sujeto) enfatiza exclusividad. 自由だけが = 'solo la libertad' como sujeto."
    },
    {
        "en": "ある (to exist) + のみ (only, nothing but) is a formal/literary expression meaning 'there is nothing except ~'. Gives an emphatic, determined nuance.",
        "pt-BR": "ある (existir) + のみ (somente, nada além) é uma expressão formal/literária que significa 'não há nada exceto ~'. Transmite uma nuance enfática e determinada.",
        "es": "ある (existir) + のみ (solo, nada más) es una expresión formal/literaria que significa 'no hay nada excepto ~'. Da un matiz enfático y decidido."
    }
],
"taidada-zutomayo": [
    {
        "en": "はず expresses the speaker's expectation or logical belief that something should be the case. 自由でいるはず = 'should be free (logically/rightfully)'.",
        "pt-BR": "はず expressa a expectativa ou crença lógica do falante de que algo deveria ser o caso. 自由でいるはず = 'deveria estar livre (lógica/legitimamente)'.",
        "es": "はず expresa la expectativa o creencia lógica del hablante de que algo debería ser así. 自由でいるはず = 'debería estar libre (lógica/legítimamente)'."
    },
    {
        "en": "ほど indicates degree or extent. In constructions like 近づくほど X, it means 'the more ~ (happens), X'. Compare with 〜ば〜ほど.",
        "pt-BR": "ほど indica grau ou extensão. Em construções como 近づくほど X, significa 'quanto mais ~ (acontece), X'. Compare com 〜ば〜ほど.",
        "es": "ほど indica grado o extensión. En construcciones como 近づくほど X, significa 'cuanto más ~ (sucede), X'. Compárese con 〜ば〜ほど."
    },
    {
        "en": "こと (nominalizer) + で (by means of) = 'by doing ~'. Transforms a verb phrase into the means/reason for something.",
        "pt-BR": "こと (nominalizador) + で (por meio de) = 'ao fazer ~'. Transforma uma frase verbal no meio/razão para algo.",
        "es": "こと (nominalizador) + で (por medio de) = 'al hacer ~'. Transforma una frase verbal en el medio/razón para algo."
    },
    {
        "en": "がる attaches to adjective stems to mean 'to show signs of being ~' or 'to act as if ~'. 強がる = to act strong.",
        "pt-BR": "がる se anexa a radicais de adjetivos para significar 'mostrar sinais de ser ~' ou 'agir como se ~'. 強がる = agir com força.",
        "es": "がる se adjunta a raíces de adjetivos para significar 'mostrar señales de ser ~' o 'actuar como si ~'. 強がる = actuar con fuerza."
    }
],
"sakura-kiss-chieco-kawabe": [
    {
        "en": "〜たら is formed from the past tense + ら, creating a conditional meaning 'if/when ~ happens'. トキメイタラ = 'if my heart flutters'.",
        "pt-BR": "〜たら é formado pelo passado + ら, criando um significado condicional 'se/quando ~ acontecer'. トキメイタラ = 'se meu coração disparar'.",
        "es": "〜たら se forma a partir del pasado + ら, creando un significado condicional 'si/cuando ~ sucede'. トキメイタラ = 'si mi corazón palpita'."
    },
    {
        "en": "より (comparative particle 'than') + も (emphasis) = 'more than ~, rather than ~'. Emphasizes the contrast between two things.",
        "pt-BR": "より (partícula comparativa 'do que') + も (ênfase) = 'mais do que ~, em vez de ~'. Enfatiza o contraste entre duas coisas.",
        "es": "より (partícula comparativa 'que') + も (énfasis) = 'más que ~, en lugar de ~'. Enfatiza el contraste entre dos cosas."
    },
    {
        "en": "X でも Y でもかまわない expresses that either option is acceptable. Commonly used to show indifference or acceptance.",
        "pt-BR": "X でも Y でもかまわない expressa que qualquer uma das opções é aceitável. Comumente usado para mostrar indiferença ou aceitação.",
        "es": "X でも Y でもかまわない expresa que cualquiera de las opciones es aceptable. Comúnmente usado para mostrar indiferencia o aceptación."
    },
    {
        "en": "The conditional form of i-adjectives: drop い, add ければ. 気づけば (気づく + ければ) = 'if/when one notices'.",
        "pt-BR": "A forma condicional dos adjetivos-i: remova い, adicione ければ. 気づけば (気づく + ければ) = 'se/quando alguém perceber'.",
        "es": "La forma condicional de los adjetivos-i: eliminar い, añadir ければ. 気づけば (気づく + ければ) = 'si/cuando alguien se da cuenta'."
    }
],
"shissou-last-alliance": [
    {
        "en": "て-form + いる expresses an ongoing action or a resulting state. Colloquially contracted to 〜てる. 繰り返してる = 'keeps repeating'.",
        "pt-BR": "Forma-te + いる expressa uma ação contínua ou um estado resultante. Coloquialmente contraído para 〜てる. 繰り返してる = 'continua repetindo'.",
        "es": "Forma-te + いる expresa una acción en curso o un estado resultante. Coloquialmente contraído a 〜てる. 繰り返してる = 'sigue repitiendo'."
    },
    {
        "en": "ぜ is a sentence-final particle used by male speakers to assert something confidently or emphatically. It conveys determination or a strong statement.",
        "pt-BR": "ぜ é uma partícula final de frase usada por falantes do sexo masculino para afirmar algo com confiança ou ênfase. Transmite determinação ou uma afirmação forte.",
        "es": "ぜ es una partícula final de oración usada por hablantes masculinos para afirmar algo con confianza o énfasis. Transmite determinación o una afirmación fuerte."
    },
    {
        "en": "Verb masu-stem + たい expresses the speaker's desire to do something. 信じたい = 'want to believe'.",
        "pt-BR": "Radical masu do verbo + たい expressa o desejo do falante de fazer algo. 信じたい = 'querer acreditar'.",
        "es": "Raíz masu del verbo + たい expresa el deseo del hablante de hacer algo. 信じたい = 'querer creer'."
    },
    {
        "en": "切る (to cut/exhaust) used as an auxiliary verb after a verb means to completely exhaust a resource. 息を切らす = 'to completely use up breath'.",
        "pt-BR": "切る (cortar/esgotar) usado como verbo auxiliar após um verbo significa esgotar completamente um recurso. 息を切らす = 'esgotar completamente o fôlego'.",
        "es": "切る (cortar/agotar) usado como verbo auxiliar después de un verbo significa agotar completamente un recurso. 息を切らす = 'agotar completamente el aliento'."
    }
],
"yokan-heidi": [
    {
        "en": "〜てほしい expresses the speaker's desire for someone else to do something. はき出してほしい = 'I want you to open up'. The subject wanting is the speaker, the one expected to do is the listener.",
        "pt-BR": "〜てほしい expressa o desejo do falante de que outra pessoa faça algo. はき出してほしい = 'quero que você se abra'. O sujeito que deseja é o falante; quem deve agir é o ouvinte.",
        "es": "〜てほしい expresa el deseo del hablante de que otra persona haga algo. はき出してほしい = 'quiero que te abras'. El sujeto que desea es el hablante; quien debe actuar es el oyente."
    },
    {
        "en": "X のことだから is used to give a reason based on known characteristics of X. 'Because I know how you are / knowing you'. Often implies predictable behavior.",
        "pt-BR": "X のことだから é usado para dar uma razão baseada nas características conhecidas de X. 'Porque eu sei como você é / te conhecendo'. Frequentemente implica comportamento previsível.",
        "es": "X のことだから se usa para dar una razón basada en las características conocidas de X. 'Porque sé cómo eres / conociéndote'. A menudo implica un comportamiento predecible."
    },
    {
        "en": "Volitional form + とする expresses an attempt or attempt in progress. 隠そうとして = 'in the process of trying to hide'.",
        "pt-BR": "Forma volitiva + とする expressa uma tentativa ou tentativa em andamento. 隠そうとして = 'no processo de tentar esconder'.",
        "es": "Forma volitiva + とする expresa un intento o intento en progreso. 隠そうとして = 'en el proceso de intentar esconder'."
    },
    {
        "en": "もしも (if by chance) combined with the たら conditional adds a sense of uncertainty or hypothetical. Used for situations that may or may not happen.",
        "pt-BR": "もしも (se por acaso) combinado com o condicional たら adiciona uma sensação de incerteza ou hipótese. Usado para situações que podem ou não acontecer.",
        "es": "もしも (si por casualidad) combinado con el condicional たら añade una sensación de incertidumbre o hipótesis. Se usa para situaciones que pueden o no ocurrir."
    }
],
"kizuato-centimillimental": [
    {
        "en": "ばかり/ばっかり after a noun or verb form means 'nothing but ~' or 'only ~', often with a nuance of excess or exclusivity. 置いてったものばっかが = 'nothing but the things you left behind'.",
        "pt-BR": "ばかり/ばっかり após um substantivo ou forma verbal significa 'nada além de ~' ou 'somente ~', frequentemente com uma nuance de excesso ou exclusividade. 置いてったものばっかが = 'nada além das coisas que você deixou para trás'.",
        "es": "ばかり/ばっかり después de un sustantivo o forma verbal significa 'nada más que ~' o 'solo ~', a menudo con un matiz de exceso o exclusividad. 置いてったものばっかが = 'nada más que las cosas que dejaste atrás'."
    },
    {
        "en": "〜たまま expresses that a state persists unchanged after an action. 刺さったまま = 'still stuck / having been stuck it remains'.",
        "pt-BR": "〜たまま expressa que um estado persiste inalterado após uma ação. 刺さったまま = 'ainda preso / tendo ficado preso, permanece assim'.",
        "es": "〜たまま expresa que un estado persiste sin cambios después de una acción. 刺さったまま = 'todavía clavado / habiéndose clavado permanece así'."
    },
    {
        "en": "代わり (substitute) + に (particle) = 'in place of ~, instead of ~'. Can indicate substitution or doing something on behalf of someone.",
        "pt-BR": "代わり (substituto) + に (partícula) = 'em lugar de ~, em vez de ~'. Pode indicar substituição ou fazer algo em nome de alguém.",
        "es": "代わり (sustituto) + に (partícula) = 'en lugar de ~, en vez de ~'. Puede indicar sustitución o hacer algo en nombre de alguien."
    },
    {
        "en": "て-form + いく (to go) expresses an action that continues into the future or moves away from the current point. 続いていく = 'will continue going forward'.",
        "pt-BR": "Forma-te + いく (ir) expressa uma ação que continua para o futuro ou se afasta do ponto atual. 続いていく = 'continuará avançando'.",
        "es": "Forma-te + いく (ir) expresa una acción que continúa hacia el futuro o se aleja del punto actual. 続いていく = 'seguirá avanzando'."
    }
],
"marutsuke-given": [
    {
        "en": "〜てしまう expresses an action that is completed, often with a nuance of regret or something happening unintentionally. 傷つけてしまう = 'end up hurting (people)'.",
        "pt-BR": "〜てしまう expressa uma ação concluída, frequentemente com uma nuance de arrependimento ou algo que acontece involuntariamente. 傷つけてしまう = 'acabar machucando (as pessoas)'.",
        "es": "〜てしまう expresa una acción completada, a menudo con un matiz de arrepentimiento o algo que sucede involuntariamente. 傷つけてしまう = 'terminar hiriendo (a las personas)'."
    },
    {
        "en": "Negative form + なる = 'come to not do ~'. 気づけなくなる = 'become unable to notice'. Indicates a change to a state of inability.",
        "pt-BR": "Forma negativa + なる = 'passar a não fazer ~'. 気づけなくなる = 'tornar-se incapaz de perceber'. Indica uma mudança para um estado de incapacidade.",
        "es": "Forma negativa + なる = 'llegar a no hacer ~'. 気づけなくなる = 'volverse incapaz de notar'. Indica un cambio a un estado de incapacidad."
    },
    {
        "en": "Verb past form + り repeated creates a pattern listing multiple alternating or representative actions. 晴れたり降られたりする = 'it clears up and gets rainy (alternately)'.",
        "pt-BR": "Forma passada do verbo + り repetida cria um padrão que lista múltiplas ações alternadas ou representativas. 晴れたり降られたりする = 'fica bom e chuvoso (alternadamente)'.",
        "es": "Forma pasada del verbo + り repetida crea un patrón que enumera múltiples acciones alternadas o representativas. 晴れたり降られたりする = 'se despeja y se pone lluvioso (alternadamente)'."
    },
    {
        "en": "て-form + おく indicates doing something in preparation for the future or leaving a state as is. 持っておく = 'hold/keep it (in readiness for when needed)'.",
        "pt-BR": "Forma-te + おく indica fazer algo em preparação para o futuro ou deixar um estado como está. 持っておく = 'segurar/manter (em prontidão para quando necessário)'.",
        "es": "Forma-te + おく indica hacer algo en preparación para el futuro o dejar un estado como está. 持っておく = 'sostener/guardar (en disposición para cuando se necesite)'."
    }
],
"wish-olivia-inspi-reira": [
    {
        "en": "よう + に after a verb creates purpose (so that ~) or manner (as if ~). 波に飲み込まれたように = 'as if swallowed by waves'.",
        "pt-BR": "よう + に após um verbo cria propósito (para que ~) ou modo (como se ~). 波に飲み込まれたように = 'como se tivesse sido engolido pelas ondas'.",
        "es": "よう + に después de un verbo crea propósito (para que ~) o modo (como si ~). 波に飲み込まれたように = 'como si hubiera sido tragado por las olas'."
    },
    {
        "en": "しか is used with a negative verb to express 'only ~ (and nothing else)'. あなたのことしか見えない = 'I can see nothing but you'.",
        "pt-BR": "しか é usado com um verbo negativo para expressar 'apenas ~ (e nada mais)'. あなたのことしか見えない = 'só consigo ver você'.",
        "es": "しか se usa con un verbo negativo para expresar 'solo ~ (y nada más)'. あなたのことしか見えない = 'no puedo ver nada más que a ti'."
    },
    {
        "en": "も (even) + いらない (not needed) = 'don't even need ~'. The も adds emphasis that even this thing is unnecessary.",
        "pt-BR": "も (mesmo) + いらない (não é necessário) = 'não precisa nem de ~'. O も adiciona ênfase de que mesmo essa coisa é desnecessária.",
        "es": "も (incluso) + いらない (no se necesita) = 'ni siquiera necesito ~'. El も añade énfasis de que incluso esto es innecesario."
    },
    {
        "en": "こと after a noun or pronoun creates an abstract reference to that topic. あなたのことしか = 'nothing but things concerning you / only about you'.",
        "pt-BR": "こと após um substantivo ou pronome cria uma referência abstrata a esse tópico. あなたのことしか = 'nada além de coisas relacionadas a você / somente sobre você'.",
        "es": "こと después de un sustantivo o pronombre crea una referencia abstracta a ese tema. あなたのことしか = 'nada más que cosas relacionadas contigo / solo sobre ti'."
    }
],
"a-little-pain-olivia-inspi-reira": [
    {
        "en": "Verb masu-stem + ながら indicates two actions happening simultaneously. 操りながら = 'while manipulating / controlling at the same time'.",
        "pt-BR": "Radical masu do verbo + ながら indica duas ações acontecendo simultaneamente. 操りながら = 'enquanto manipula / controla ao mesmo tempo'.",
        "es": "Raíz masu del verbo + ながら indica dos acciones sucediendo simultáneamente. 操りながら = 'mientras manipula / controla al mismo tiempo'."
    },
    {
        "en": "ため + に after a verb or noun indicates purpose or reason. 強くなるために = 'in order to become strong'.",
        "pt-BR": "ため + に após um verbo ou substantivo indica propósito ou razão. 強くなるために = 'para ficar forte'.",
        "es": "ため + に después de un verbo o sustantivo indica propósito o razón. 強くなるために = 'con el fin de hacerse fuerte'."
    },
    {
        "en": "Verb masu-stem + 続ける = to keep doing something continuously. 叫び続ける = 'keep crying out'.",
        "pt-BR": "Radical masu do verbo + 続ける = continuar fazendo algo continuamente. 叫び続ける = 'continuar gritando'.",
        "es": "Raíz masu del verbo + 続ける = seguir haciendo algo continuamente. 叫び続ける = 'seguir gritando'."
    },
    {
        "en": "ように after a verb expresses purpose or a wish. 目を覚ますように = 'so as to wake up / in the way of awakening'.",
        "pt-BR": "ように após um verbo expressa propósito ou um desejo. 目を覚ますように = 'de modo a acordar / na forma de despertar'.",
        "es": "ように después de un verbo expresa propósito o un deseo. 目を覚ますように = 'de modo que despierte / en la manera del despertar'."
    }
],
"starless-night-olivia-inspi-reira": [
    {
        "en": "さえ is a particle meaning 'even'. It emphasizes that what follows is surprising or that even this extreme case applies. 矛盾さえ = 'even contradictions'.",
        "pt-BR": "さえ é uma partícula que significa 'mesmo' ou 'até'. Enfatiza que o que se segue é surpreendente ou que até mesmo esse caso extremo se aplica. 矛盾さえ = 'até contradições'.",
        "es": "さえ es una partícula que significa 'incluso'. Enfatiza que lo que sigue es sorprendente o que incluso este caso extremo aplica. 矛盾さえ = 'incluso contradicciones'."
    },
    {
        "en": "て-form + くれた means someone did something for the speaker's benefit (past tense). そっとつないでくれた = 'gently held (my hand) for me'.",
        "pt-BR": "Forma-te + くれた significa que alguém fez algo em benefício do falante (passado). そっとつないでくれた = 'gentilmente segurou (minha mão) por mim'.",
        "es": "Forma-te + くれた significa que alguien hizo algo en beneficio del hablante (pasado). そっとつないでくれた = 'suavemente tomó (mi mano) por mí'."
    },
    {
        "en": "は + しない adds strong emphasis to negation. 離しはしない = 'I definitely will NOT let go'. The は highlights the action being negated.",
        "pt-BR": "は + しない adiciona forte ênfase à negação. 離しはしない = 'definitivamente NÃO vou soltar'. O は destaca a ação sendo negada.",
        "es": "は + しない añade un fuerte énfasis a la negación. 離しはしない = 'definitivamente NO voy a soltar'. El は resalta la acción que se niega."
    },
    {
        "en": "て-form + しまう expresses completion often with a nuance of regret or something happening despite the speaker's wish. 臆病になってしまうけど = 'even though I end up becoming timid'.",
        "pt-BR": "Forma-te + しまう expressa conclusão frequentemente com uma nuance de arrependimento ou algo acontecendo apesar do desejo do falante. 臆病になってしまうけど = 'mesmo que eu acabe me tornando covarde'.",
        "es": "Forma-te + しまう expresa completitud a menudo con un matiz de arrepentimiento o algo que sucede a pesar del deseo del hablante. 臆病になってしまうけど = 'aunque termine volviéndome tímido'."
    }
],
"kuroi-namida-anna-inspi-nana": [
    {
        "en": "ように after a verb expresses purpose or a wish/prayer. 来ないように願う = 'wish that (tomorrow) won't come'.",
        "pt-BR": "ように após um verbo expressa propósito ou um desejo/oração. 来ないように願う = 'desejar que (o amanhã) não venha'.",
        "es": "ように después de un verbo expresa propósito o un deseo/oración. 来ないように願う = 'desear que (el mañana) no llegue'."
    },
    {
        "en": "〜のは nominalizes a verb phrase, and 止めよう is the volitional form of 止める. Together: 'Let's stop doing ~'.",
        "pt-BR": "〜のは nominaliza uma frase verbal, e 止めよう é a forma volitiva de 止める. Juntos: 'Vamos parar de fazer ~'.",
        "es": "〜のは nominaliza una frase verbal, y 止めよう es la forma volitiva de 止める. Juntos: 'Dejemos de hacer ~'."
    },
    {
        "en": "すぎる attached to verb masu-stem or adjective stem means 'too much' or 'excessively'. 悲しすぎて = 'being too sad'.",
        "pt-BR": "すぎる anexado ao radical masu de um verbo ou radical de adjetivo significa 'demais' ou 'excessivamente'. 悲しすぎて = 'estar triste demais'.",
        "es": "すぎる adjunto a la raíz masu de un verbo o raíz de adjetivo significa 'demasiado' o 'en exceso'. 悲しすぎて = 'estar demasiado triste'."
    },
    {
        "en": "まま expresses that something remains in the same state. このままの私で = 'with me as I am (unchanged)', keeping the current state.",
        "pt-BR": "まま expressa que algo permanece no mesmo estado. このままの私で = 'comigo como sou (inalterado)', mantendo o estado atual.",
        "es": "まま expresa que algo permanece en el mismo estado. このままの私で = 'conmigo tal como soy (sin cambios)', manteniendo el estado actual."
    }
],
"ambivalent-uru": [
    {
        "en": "みたい is a colloquial resemblance expression meaning 'like' or 'seems like'. 猫みたいで = 'like a cat, and...'.",
        "pt-BR": "みたい é uma expressão de semelhança coloquial que significa 'como' ou 'parece'. 猫みたいで = 'como um gato, e...'.",
        "es": "みたい es una expresión coloquial de semejanza que significa 'como' o 'parece'. 猫みたいで = 'como un gato, y...'."
    },
    {
        "en": "の/ん nominalizes a verb phrase, making it the subject of a sentence. 君が眩しく感じるのは = 'the reason/fact that I find you dazzling'.",
        "pt-BR": "の/ん nominaliza uma frase verbal, tornando-a o sujeito de uma frase. 君が眩しく感じるのは = 'a razão/fato de que acho você deslumbrante'.",
        "es": "の/ん nominaliza una frase verbal, convirtiéndola en el sujeto de una oración. 君が眩しく感じるのは = 'la razón/el hecho de que te encuentro deslumbrante'."
    },
    {
        "en": "〜たまま expresses that a state continues unchanged. どこかにしまったまま = 'still kept away somewhere (without being taken out)'.",
        "pt-BR": "〜たまま expressa que um estado continua inalterado. どこかにしまったまま = 'ainda guardado em algum lugar (sem ter sido tirado)'.",
        "es": "〜たまま expresa que un estado continúa sin cambios. どこかにしまったまま = 'todavía guardado en algún lugar (sin haber sido sacado)'."
    },
    {
        "en": "Noun + なら = 'if it's ~, given ~'. Combined with どうする = 'what would [that person] do?' — used to wonder about another's reaction.",
        "pt-BR": "Substantivo + なら = 'se for ~, dado ~'. Combinado com どうする = 'o que [essa pessoa] faria?' — usado para se perguntar sobre a reação de outra pessoa.",
        "es": "Sustantivo + なら = 'si es ~, dado ~'. Combinado con どうする = '¿qué haría [esa persona]?' — se usa para preguntarse sobre la reacción de alguien."
    }
],
"aikotoba-aina-the-end": [
    {
        "en": "じゃなくて is the negative て-form of じゃない (is not). Used to contrast: 'it's not A, but B'. 飾りみたいじゃなくて = 'not like a decoration, but...'.",
        "pt-BR": "じゃなくて é a forma-te negativa de じゃない (não é). Usado para contrastar: 'não é A, mas B'. 飾りみたいじゃなくて = 'não como uma decoração, mas...'.",
        "es": "じゃなくて es la forma-te negativa de じゃない (no es). Se usa para contrastar: 'no es A, sino B'. 飾りみたいじゃなくて = 'no como una decoración, sino...'."
    },
    {
        "en": "て-form + もらう = to receive the action done for you. 抱きしめてもらう = 'to be embraced / to have someone hold me'.",
        "pt-BR": "Forma-te + もらう = receber a ação feita para você. 抱きしめてもらう = 'ser abraçado / ter alguém me segurando'.",
        "es": "Forma-te + もらう = recibir la acción hecha para ti. 抱きしめてもらう = 'ser abrazado / que alguien me sostenga'."
    },
    {
        "en": "に + でも repeated creates a range 'whether as A or B'. 光にでも影にでも = 'whether as light or as shadow'. でも here = 'even'.",
        "pt-BR": "に + でも repetido cria um intervalo 'seja como A ou B'. 光にでも影にでも = 'seja como luz ou como sombra'. でも aqui = 'mesmo'.",
        "es": "に + でも repetido crea un rango 'ya sea como A o como B'. 光にでも影にでも = 'ya sea como luz o como sombra'. でも aquí = 'incluso'."
    },
    {
        "en": "ほど (extent) + の (attributive particle) indicates the degree/extent of something. 使い道がないほどの温もり = 'warmth to such an extent that it has no place to go'.",
        "pt-BR": "ほど (extensão) + の (partícula atributiva) indica o grau/extensão de algo. 使い道がないほどの温もり = 'calor em tal extensão que não tem para onde ir'.",
        "es": "ほど (extensión) + の (partícula atributiva) indica el grado/extensión de algo. 使い道がないほどの温もり = 'calidez en tal medida que no tiene adónde ir'."
    }
],
"ai-wa-kusuri-wacci": [
    {
        "en": "に + して + いた = past progressive/habitual form. 後回しにしてた = 'had been putting off / was in the habit of postponing'.",
        "pt-BR": "に + して + いた = forma progressiva/habitual do passado. 後回しにしてた = 'estava adiando / tinha o hábito de postergar'.",
        "es": "に + して + いた = forma progresiva/habitual pasada. 後回しにしてた = 'había estado postergando / tenía el hábito de posponer'."
    },
    {
        "en": "て + いく (colloquially contracted to ~てく) means an action continues outward or into the future. 染みてく = 'soaking in (progressively)'.",
        "pt-BR": "て + いく (coloquialmente contraído para ~てく) significa que uma ação continua para fora ou para o futuro. 染みてく = 'absorvendo (progressivamente)'.",
        "es": "て + いく (coloquialmente contraído a ~てく) significa que una acción continúa hacia afuera o hacia el futuro. 染みてく = 'absorbiendo (progresivamente)'."
    },
    {
        "en": "まで after a verb or noun indicates a limit point in time or space: 'until ~'. 言えるまで = 'until I can say it'.",
        "pt-BR": "まで após um verbo ou substantivo indica um ponto limite no tempo ou espaço: 'até ~'. 言えるまで = 'até eu conseguir dizer'.",
        "es": "まで después de un verbo o sustantivo indica un punto límite en el tiempo o espacio: 'hasta ~'. 言えるまで = 'hasta que pueda decirlo'."
    },
    {
        "en": "〜ようとも is a concessive construction (classical/literary) meaning 'even if ~ happens'. 罪を犯そうとも = 'even if I commit a sin'.",
        "pt-BR": "〜ようとも é uma construção concessiva (clássica/literária) que significa 'mesmo que ~ aconteça'. 罪を犯そうとも = 'mesmo que eu cometa um pecado'.",
        "es": "〜ようとも es una construcción concesiva (clásica/literaria) que significa 'aunque ~ suceda'. 罪を犯そうとも = 'aunque cometa un pecado'."
    }
],
"paint-i-dont-like-mondays": [
    {
        "en": "て-form + ゆけ (imperative of 行く) = an imperative 'go on doing ~'. 描いてゆけ = 'keep drawing / go forth drawing'. More literary/emphatic than 行って.",
        "pt-BR": "Forma-te + ゆけ (imperativo de 行く) = um imperativo 'continue fazendo ~'. 描いてゆけ = 'continue desenhando / avance desenhando'. Mais literário/enfático do que 行って.",
        "es": "Forma-te + ゆけ (forma imperativa de 行く) = un imperativo 'sigue haciendo ~'. 描いてゆけ = 'sigue dibujando / avanza dibujando'. Más literario/enfático que 行って."
    },
    {
        "en": "さえ (even) + も (also/even) = 'even ~ too'. Emphasizes that even this extreme case is included. 価値観さえも = 'even the values'.",
        "pt-BR": "さえ (mesmo) + も (também/mesmo) = 'até ~ também'. Enfatiza que até mesmo esse caso extremo está incluído. 価値観さえも = 'até os valores'.",
        "es": "さえ (incluso) + も (también/incluso) = 'incluso ~ también'. Enfatiza que incluso este caso extremo está incluido. 価値観さえも = 'incluso los valores'."
    },
    {
        "en": "Volitional form + とする = attempt or be on the verge of doing something. 崩れ去ろうとした = 'tried to crumble away'.",
        "pt-BR": "Forma volitiva + とする = tentativa ou estar à beira de fazer algo. 崩れ去ろうとした = 'tentou se desintegrar'.",
        "es": "Forma volitiva + とする = intento o estar a punto de hacer algo. 崩れ去ろうとした = 'intentó desmoronarse'."
    },
    {
        "en": "てしまえ (command of てしまう) + ばいい (if it's good) + だろう (probably) = suggests 'may as well just do it'. 塗り替えてしまえばいいだろう = 'may as well repaint it'.",
        "pt-BR": "てしまえ (comando de てしまう) + ばいい (se for bom) + だろう (provavelmente) = sugere 'tanto faz, pode fazer'. 塗り替えてしまえばいいだろう = 'tanto faz repintar'.",
        "es": "てしまえ (mandato de てしまう) + ばいい (si es bueno) + だろう (probablemente) = sugiere 'bien podría hacerlo'. 塗り替えてしまえばいいだろう = 'bien podría repintarlo'."
    }
],
"the-peak-sekai-no-owari": [
    {
        "en": "〜ずに is the classical negative te-form (= ないで in modern Japanese). 起き上がれずに = 'without being able to get up'. Used in more formal or literary contexts.",
        "pt-BR": "〜ずに é a forma-te negativa clássica (= ないで no japonês moderno). 起き上がれずに = 'sem conseguir se levantar'. Usado em contextos mais formais ou literários.",
        "es": "〜ずに es la forma-te negativa clásica (= ないで en japonés moderno). 起き上がれずに = 'sin poder levantarse'. Se usa en contextos más formales o literarios."
    },
    {
        "en": "〜んだろう = のだろう = explanatory (ん/の) + speculative (だろう). 笑ってるんだろう = 'probably laughing (numb)'.",
        "pt-BR": "〜んだろう = のだろう = explicativo (ん/の) + especulativo (だろう). 笑ってるんだろう = 'provavelmente rindo (entorpecido)'.",
        "es": "〜んだろう = のだろう = explicativo (ん/の) + especulativo (だろう). 笑ってるんだろう = 'probablemente riendo (entumecido)'."
    },
    {
        "en": "て-form + も = 'even if ~'. Used in concessive clauses. 止まってたら ~ なくなる pairs with the nuance that stopping = things cease.",
        "pt-BR": "Forma-te + も = 'mesmo que ~'. Usado em orações concessivas. 止まってたら ~ なくなる combina com a nuance de que parar = as coisas cessam.",
        "es": "Forma-te + も = 'aunque ~'. Usado en cláusulas concesivas. 止まってたら ~ なくなる se combina con el matiz de que detenerse = las cosas cesan."
    },
    {
        "en": "ギリギリ is an onomatopoeic word for 'just barely' or 'at the limit'. ギリギリで = 'barely, at the very edge of'.",
        "pt-BR": "ギリギリ é uma palavra onomatopaica para 'por pouco' ou 'no limite'. ギリギリで = 'por pouco, bem na borda'.",
        "es": "ギリギリ es una palabra onomatopéyica para 'apenas' o 'al límite'. ギリギリで = 'apenas, al borde mismo'."
    }
],
"angel-and-devil-gren-boyz": [
    {
        "en": "だろう is the speculative form of だ, expressing probability or supposition. 知るだろう = 'probably will know/realize'.",
        "pt-BR": "だろう é a forma especulativa de だ, expressando probabilidade ou suposição. 知るだろう = 'provavelmente saberá/perceberá'.",
        "es": "だろう es la forma especulativa de だ, que expresa probabilidad o suposición. 知るだろう = 'probablemente sabrá/se dará cuenta'."
    },
    {
        "en": "When used at the end of a sentence ように expresses a wish or prayer. 守られますように = 'may [you] be protected'. Common in prayers and wishes.",
        "pt-BR": "Quando usado no final de uma frase, ように expressa um desejo ou oração. 守られますように = 'que [você] seja protegido'. Comum em orações e desejos.",
        "es": "Cuando se usa al final de una oración, ように expresa un deseo u oración. 守られますように = 'que [usted] sea protegido'. Común en oraciones y deseos."
    },
    {
        "en": "Verb masu-stem + きれない = cannot do completely / impossible to do fully. 書ききれない = 'cannot write (it) all out completely'.",
        "pt-BR": "Radical masu do verbo + きれない = não consegue fazer completamente / impossível de fazer totalmente. 書ききれない = 'não consigo escrever tudo completamente'.",
        "es": "Raíz masu del verbo + きれない = no puede hacer completamente / imposible de hacer totalmente. 書ききれない = 'no puedo escribirlo todo completamente'."
    },
    {
        "en": "たびに after a verb or noun means 'every time ~ happens'. 時の過ぎゆく速さを知るたびに = 'every time I realize how fast time passes'.",
        "pt-BR": "たびに após um verbo ou substantivo significa 'cada vez que ~ acontece'. 時の過ぎゆく速さを知るたびに = 'cada vez que percebo como o tempo passa rápido'.",
        "es": "たびに después de un verbo o sustantivo significa 'cada vez que ~ sucede'. 時の過ぎゆく速さを知るたびに = 'cada vez que me doy cuenta de lo rápido que pasa el tiempo'."
    }
]
}

def main():
    for slug, translations in TRANSLATIONS.items():
        path = os.path.join(CACHE_DIR, f"{slug}.json")
        with open(path, encoding="utf-8") as f:
            lesson = json.load(f)

        gps = lesson["grammar_points"]
        for i, gp in enumerate(gps):
            if isinstance(gp.get("explanation"), str):
                t = translations[i]
                gp["explanation"] = {
                    "en": t["en"],
                    "pt-BR": t["pt-BR"],
                    "es": t["es"]
                }

        with open(path, "w", encoding="utf-8") as f:
            json.dump(lesson, f, ensure_ascii=False, indent=2)

        print(f"Fixed: {slug}")

    print("All 20 files updated.")

if __name__ == "__main__":
    main()
