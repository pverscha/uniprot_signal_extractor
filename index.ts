import { SAXParser } from "https://unpkg.com/sax-ts@1.2.12/src/sax.ts";

const FASTA_LENGTH = 60;

const p = new SAXParser(false, {});

let accession = "";
let inFeature = false;
let inLocation = false;
let inAccession = false;
let inSequence = false;

let currentItem: any = {};

const reset = function() {
    accession = "";
    inFeature = false;
    inLocation = false;
    inAccession = false;
    inSequence = false;
    currentItem = {};
}

const writeCurrentItemToFasta = function() {
    console.log(">" + currentItem.accession);

    let sequence = currentItem.sequence;
    if ("signalStart" in currentItem && "signalEnd" in currentItem) {
        sequence = sequence.substring(0, currentItem.signalStart) + sequence.substring(currentItem.signalEnd + 1);
    }

    let start = 0;
    while (start < sequence.length) {
        console.log(sequence.substring(start, Math.min(start + FASTA_LENGTH)));
        start += FASTA_LENGTH;
    }
}

const onOpenTagHandler = function (node: any) {
    switch (node.name) {
        case "ENTRY":
            reset();
            break;
        case "ACCESSION":
            inAccession = true;
            break;
        case "SEQUENCE":
            inSequence = true;
            break;
        case "FEATURE":
            if (node.attributes["TYPE"] === "signal peptide") {
                inFeature = true;
            }
            break;
        case "LOCATION":
            inLocation = true;
            break;
        case "BEGIN":
            if (inFeature && inLocation) {
                if (!isNaN(Number.parseInt(node.attributes["POSITION"]))) {
                    currentItem.signalStart = Number.parseInt(node.attributes["POSITION"]) - 1;
                } else {
                    inFeature = false;
                }
            }
            break;
        case "END":
            if (inFeature && inLocation) {
                if (!isNaN(Number.parseInt(node.attributes["POSITION"]))) {
                    currentItem.signalEnd = Number.parseInt(node.attributes["POSITION"]) - 1;
                } else {
                    inFeature = false;
                }
            }
            break;
        default:
            break;
    }
};

const onTextHandler = function(t: string) {
    if (inAccession) {
        currentItem.accession = t;
    } else if (inSequence) {
        currentItem.sequence = t;
    }
}

const onCloseTagHandler = function(name: string) {
    switch (name) {
        case "ENTRY":
            // Write to stdout as FASTA
            writeCurrentItemToFasta();
            break;
        case "ACCESSION":
            inAccession = false;
            break;
        case "SEQUENCE":
            inSequence = false;
            break;
        case "FEATURE":
            inFeature = false;
            break;
        case "LOCATION":
            inLocation = false;
            break;
        default:
            break;
    }
}


p.onerror = function (e: any) {
    console.error("An unexpected error occurred: ");
    console.error(e);
    Deno.exit(1);
};

p.onopentag = onOpenTagHandler;
p.onclosetag = onCloseTagHandler;
p.ontext = onTextHandler;

const decoder = new TextDecoder();
for await (const chunk of Deno.stdin.readable) {
    const text = decoder.decode(chunk);
    p.write(text);
}
