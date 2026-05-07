"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";

export default function CalculatorPage() {
  const stateNames: Record<string, string> = {
    AL: "Alabama",
    AK: "Alaska",
    AZ: "Arizona",
    AR: "Arkansas",
    CA: "California",
    CO: "Colorado",
    CT: "Connecticut",
    DE: "Delaware",
    FL: "Florida",
    GA: "Georgia",
    HI: "Hawaii",
    ID: "Idaho",
    IL: "Illinois",
    IN: "Indiana",
    IA: "Iowa",
    KS: "Kansas",
    KY: "Kentucky",
    LA: "Louisiana",
    ME: "Maine",
    MD: "Maryland",
    MA: "Massachusetts",
    MI: "Michigan",
    MN: "Minnesota",
    MS: "Mississippi",
    MO: "Missouri",
    MT: "Montana",
    NE: "Nebraska",
    NV: "Nevada",
    NH: "New Hampshire",
    NJ: "New Jersey",
    NM: "New Mexico",
    NY: "New York",
    NC: "North Carolina",
    ND: "North Dakota",
    OH: "Ohio",
    OK: "Oklahoma",
    OR: "Oregon",
    PA: "Pennsylvania",
    RI: "Rhode Island",
    SC: "South Carolina",
    SD: "South Dakota",
    TN: "Tennessee",
    TX: "Texas",
    UT: "Utah",
    VT: "Vermont",
    VA: "Virginia",
    WA: "Washington",
    WV: "West Virginia",
    WI: "Wisconsin",
    WY: "Wyoming",
    DC: "Washington DC",
  };

  const stateHourlyRates: Record<string, number> = {
    AL: 140,
    AK: 180,
    AZ: 150,
    AR: 140,
    CA: 200,
    CO: 175,
    CT: 180,
    DE: 160,
    FL: 155,
    GA: 160,
    HI: 220,
    ID: 150,
    IL: 180,
    IN: 150,
    IA: 145,
    KS: 145,
    KY: 145,
    LA: 150,
    ME: 160,
    MD: 170,
    MA: 190,
    MI: 165,
    MN: 170,
    MS: 140,
    MO: 150,
    MT: 150,
    NE: 145,
    NV: 175,
    NH: 160,
    NJ: 200,
    NM: 150,
    NY: 220,
    NC: 150,
    ND: 145,
    OH: 155,
    OK: 145,
    OR: 190,
    PA: 170,
    RI: 170,
    SC: 145,
    SD: 140,
    TN: 150,
    TX: 160,
    UT: 155,
    VT: 160,
    VA: 165,
    WA: 200,
    WV: 140,
    WI: 155,
    WY: 150,
    DC: 210,
  };

  const stateTaxRates: Record<string, number> = {
    AL: 4,
    AK: 0,
    AZ: 8.6,
    AR: 6.5,
    CA: 7.25,
    CO: 2.9,
    CT: 6.35,
    DE: 0,
    FL: 6.0,
    GA: 4.0,
    HI: 4.0,
    ID: 6.0,
    IL: 6.25,
    IN: 7.0,
    IA: 6.0,
    KS: 6.5,
    KY: 6.0,
    LA: 4.45,
    ME: 5.5,
    MD: 6.0,
    MA: 6.25,
    MI: 6.0,
    MN: 6.875,
    MS: 7.0,
    MO: 4.225,
    MT: 0,
    NE: 5.5,
    NV: 8.38,
    NH: 0,
    NJ: 6.625,
    NM: 5.125,
    NY: 8.875,
    NC: 4.75,
    ND: 5.0,
    OH: 5.75,
    OK: 4.5,
    OR: 0,
    PA: 6.0,
    RI: 7.0,
    SC: 6.0,
    SD: 4.5,
    TN: 7.0,
    TX: 8.25,
    UT: 4.85,
    VT: 6.0,
    VA: 5.3,
    WA: 6.5,
    WV: 6.0,
    WI: 5.0,
    WY: 4.0,
    DC: 6.0,
  };

  const cityRateMultipliers: Record<string, Record<string, number>> = {
    AL: {
      "Statewide Average": 1,
      Birmingham: 1.08,
      Montgomery: 1,
      Mobile: 1.03,
      Huntsville: 1.08,
      Tuscaloosa: 1.02,
    },
    AK: {
      "Statewide Average": 1,
      Anchorage: 1.08,
      Fairbanks: 1.02,
      Juneau: 1.06,
    },
    AZ: {
      "Statewide Average": 1,
      Phoenix: 1.08,
      Scottsdale: 1.18,
      Tempe: 1.08,
      Tucson: 1,
      Mesa: 1.02,
      Flagstaff: 1.08,
    },
    AR: {
      "Statewide Average": 1,
      "Little Rock": 1.08,
      Fayetteville: 1.08,
      "Fort Smith": 1,
      "Hot Springs": 1.04,
    },
    CA: {
      "Statewide Average": 1,
      "Los Angeles": 1.3,
      "San Francisco": 1.4,
      "San Diego": 1.22,
      Sacramento: 1.08,
      Oakland: 1.28,
      "San Jose": 1.3,
      "Inland Empire": 1.02,
      Fresno: 0.95,
    },
    CO: {
      "Statewide Average": 1,
      Denver: 1.15,
      Boulder: 1.2,
      "Colorado Springs": 1.02,
      "Fort Collins": 1.08,
      Aspen: 1.3,
    },
    CT: {
      "Statewide Average": 1,
      Hartford: 1,
      "New Haven": 1.08,
      Stamford: 1.2,
      Bridgeport: 1.05,
    },
    DE: {
      "Statewide Average": 1,
      Wilmington: 1.08,
      Dover: 1,
      Newark: 1.04,
    },
    FL: {
      "Statewide Average": 1,
      Miami: 1.25,
      Orlando: 1.12,
      Tampa: 1.08,
      Jacksonville: 1,
      "Fort Lauderdale": 1.18,
      "West Palm Beach": 1.18,
    },
    GA: {
      "Statewide Average": 1,
      Atlanta: 1.18,
      Savannah: 1.08,
      Augusta: 1,
      Athens: 1.05,
      Macon: 0.95,
    },
    HI: {
      "Statewide Average": 1,
      Honolulu: 1.18,
      Maui: 1.15,
      Hilo: 1,
      Kona: 1.08,
    },
    ID: {
      "Statewide Average": 1,
      Boise: 1.08,
      Meridian: 1.05,
      "Idaho Falls": 1,
      Coeurdalene: 1.08,
    },
    IL: {
      "Statewide Average": 1,
      Chicago: 1.22,
      Naperville: 1.12,
      Springfield: 0.98,
      Rockford: 0.95,
      Peoria: 0.98,
    },
    IN: {
      "Statewide Average": 1,
      Indianapolis: 1.08,
      "Fort Wayne": 1,
      Bloomington: 1.05,
      "South Bend": 1,
    },
    IA: {
      "Statewide Average": 1,
      "Des Moines": 1.06,
      "Iowa City": 1.05,
      "Cedar Rapids": 1,
      Davenport: 1,
    },
    KS: {
      "Statewide Average": 1,
      Wichita: 1,
      "Kansas City": 1.06,
      Lawrence: 1.06,
      Topeka: 0.98,
    },
    KY: {
      "Statewide Average": 1,
      Louisville: 1.08,
      Lexington: 1.05,
      "Bowling Green": 1,
    },
    LA: {
      "Statewide Average": 1,
      "New Orleans": 1.15,
      "Baton Rouge": 1.05,
      Lafayette: 1,
      Shreveport: 0.95,
    },
    ME: {
      "Statewide Average": 1,
      Portland: 1.12,
      Bangor: 1,
      Augusta: 0.98,
    },
    MD: {
      "Statewide Average": 1,
      Baltimore: 1.08,
      Annapolis: 1.12,
      Bethesda: 1.2,
      "Silver Spring": 1.12,
    },
    MA: {
      "Statewide Average": 1,
      Boston: 1.25,
      Cambridge: 1.25,
      Worcester: 1.05,
      Salem: 1.12,
      Springfield: 0.98,
    },
    MI: {
      "Statewide Average": 1,
      Detroit: 1.08,
      "Grand Rapids": 1.05,
      "Ann Arbor": 1.12,
      Lansing: 1,
      TraverseCity: 1.08,
    },
    MN: {
      "Statewide Average": 1,
      Minneapolis: 1.12,
      "St. Paul": 1.08,
      Duluth: 1,
      Rochester: 1.02,
    },
    MS: {
      "Statewide Average": 1,
      Jackson: 1,
      Gulfport: 1,
      Oxford: 1.05,
      Biloxi: 1.02,
    },
    MO: {
      "Statewide Average": 1,
      "Kansas City": 1.08,
      "St. Louis": 1.08,
      Springfield: 1,
      Columbia: 1.04,
    },
    MT: {
      "Statewide Average": 1,
      Bozeman: 1.15,
      Missoula: 1.08,
      Billings: 1,
      Helena: 1.02,
    },
    NE: {
      "Statewide Average": 1,
      Omaha: 1.06,
      Lincoln: 1.04,
      "Grand Island": 0.98,
    },
    NV: {
      "Statewide Average": 1,
      "Las Vegas": 1.18,
      Reno: 1.08,
      Henderson: 1.08,
      "Carson City": 1,
    },
    NH: {
      "Statewide Average": 1,
      Manchester: 1.06,
      Portsmouth: 1.12,
      Nashua: 1.08,
    },
    NJ: {
      "Statewide Average": 1,
      Newark: 1.08,
      "Jersey City": 1.18,
      Hoboken: 1.22,
      "Asbury Park": 1.12,
      Princeton: 1.15,
    },
    NM: {
      "Statewide Average": 1,
      Albuquerque: 1.04,
      "Santa Fe": 1.12,
      "Las Cruces": 0.98,
      Taos: 1.08,
    },
    NY: {
      "Statewide Average": 1,
      "New York City": 1.35,
      Brooklyn: 1.32,
      Queens: 1.25,
      "Long Island": 1.18,
      Buffalo: 0.95,
      Rochester: 0.95,
      Albany: 1,
      Syracuse: 0.95,
    },
    NC: {
      "Statewide Average": 1,
      Charlotte: 1.1,
      Raleigh: 1.1,
      Durham: 1.08,
      Asheville: 1.12,
      Wilmington: 1.05,
      Greensboro: 1,
    },
    ND: {
      "Statewide Average": 1,
      Fargo: 1.05,
      Bismarck: 1,
      "Grand Forks": 0.98,
    },
    OH: {
      "Statewide Average": 1,
      Columbus: 1.08,
      Cleveland: 1.05,
      Cincinnati: 1.06,
      Dayton: 0.98,
      Toledo: 0.98,
    },
    OK: {
      "Statewide Average": 1,
      "Oklahoma City": 1.05,
      Tulsa: 1.05,
      Norman: 1.02,
    },
    OR: {
      "Statewide Average": 1,
      Portland: 1.15,
      Eugene: 1.05,
      Bend: 1.15,
      Salem: 1,
      Medford: 0.98,
    },
    PA: {
      "Statewide Average": 1,
      Philadelphia: 1.15,
      Pittsburgh: 1.08,
      Lancaster: 1.02,
      Harrisburg: 1,
      Allentown: 1.02,
    },
    RI: {
      "Statewide Average": 1,
      Providence: 1.08,
      Newport: 1.15,
      Warwick: 1,
    },
    SC: {
      "Statewide Average": 1,
      Charleston: 1.15,
      Columbia: 1.04,
      Greenville: 1.05,
      MyrtleBeach: 1.08,
    },
    SD: {
      "Statewide Average": 1,
      "Sioux Falls": 1.05,
      "Rapid City": 1.02,
      Aberdeen: 0.98,
    },
    TN: {
      "Statewide Average": 1,
      Nashville: 1.15,
      Memphis: 1.05,
      Knoxville: 1.05,
      Chattanooga: 1.04,
    },
    TX: {
      "Statewide Average": 1,
      Austin: 1.18,
      Dallas: 1.12,
      Houston: 1.08,
      "San Antonio": 1.04,
      "Fort Worth": 1.05,
      ElPaso: 0.95,
    },
    UT: {
      "Statewide Average": 1,
      "Salt Lake City": 1.1,
      ParkCity: 1.2,
      Provo: 1.05,
      Ogden: 1,
    },
    VT: {
      "Statewide Average": 1,
      Burlington: 1.1,
      Montpelier: 1.02,
      Rutland: 0.98,
    },
    VA: {
      "Statewide Average": 1,
      Richmond: 1.08,
      Arlington: 1.2,
      Alexandria: 1.18,
      "Virginia Beach": 1.05,
      Norfolk: 1.02,
    },
    WA: {
      "Statewide Average": 1,
      Seattle: 1.25,
      Bellevue: 1.28,
      Tacoma: 1.08,
      Spokane: 0.98,
      Olympia: 1.04,
      Vancouver: 1.05,
    },
    WV: {
      "Statewide Average": 1,
      Charleston: 1,
      Morgantown: 1.05,
      Huntington: 0.98,
    },
    WI: {
      "Statewide Average": 1,
      Milwaukee: 1.06,
      Madison: 1.1,
      "Green Bay": 1,
      Kenosha: 1,
    },
    WY: {
      "Statewide Average": 1,
      Jackson: 1.25,
      Cheyenne: 1.02,
      Casper: 1,
      Laramie: 1.02,
    },
    DC: {
      "Statewide Average": 1,
      "Washington DC": 1.15,
    },
  };

  const [shopName, setShopName] = useState("Artist Protection Alliance");
  const [artistName, setArtistName] = useState("");
  const [shopEmail, setShopEmail] = useState("");
  const [sendShopCopy, setSendShopCopy] = useState(true);

  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [tattooDescription, setTattooDescription] = useState("");

  const [state, setState] = useState("AZ");
  const [city, setCity] = useState("Statewide Average");
  const [hourlyRate, setHourlyRate] = useState(stateHourlyRates.AZ);
  const [hours, setHours] = useState(2);
  const [pricingMode, setPricingMode] = useState<"hourly" | "piece">("hourly");
  const [piecePrice, setPiecePrice] = useState(300);

  const [materials, setMaterials] = useState(25);
  const [boothRent, setBoothRent] = useState(40);
  const [applyTax, setApplyTax] = useState(true);
  const [taxRate, setTaxRate] = useState(stateTaxRates.AZ);
  const [bookingInstructions, setBookingInstructions] = useState("");
  const [bookingLink, setBookingLink] = useState("");

  const [depositRequired, setDepositRequired] = useState(false);
  const [depositPercent, setDepositPercent] = useState(20);
  const [paymentInstructions, setPaymentInstructions] = useState("");
  const [depositDueHours, setDepositDueHours] = useState(24);

  const [applyDiscount, setApplyDiscount] = useState(false);
  const [discount, setDiscount] = useState(0);

  const [quoteLink, setQuoteLink] = useState("");
  const [isCreatingQuoteLink, setIsCreatingQuoteLink] = useState(false);

  const minimumCharge = 150;

  const cityOptions = Object.keys(cityRateMultipliers[state] || { "Statewide Average": 1 });
  const cityMultiplier = cityRateMultipliers[state]?.[city] || 1;
  const suggestedHourlyRate = Math.round(stateHourlyRates[state] * cityMultiplier);

  const basePrice = pricingMode === "hourly" ? hourlyRate * hours : piecePrice;
  const subtotalBeforeDiscount = basePrice + materials + boothRent;
  const discountAmount = applyDiscount ? discount : 0;
  const taxableSubtotal = Math.max(subtotalBeforeDiscount - discountAmount, 0);
  const taxAmount = applyTax ? taxableSubtotal * (taxRate / 100) : 0;
  const total = taxableSubtotal + taxAmount;

  const roundedTotal = Math.round(total / 10) * 10;
  const finalTotal = Math.max(roundedTotal, minimumCharge);

  const depositAmount = depositRequired
  ? Math.round(finalTotal * (depositPercent / 100))
  : 0;

  const profit = basePrice - materials - boothRent;
  const profitMargin = basePrice > 0 ? (profit / basePrice) * 100 : 0;

  const confidenceMessage =
    profitMargin < 30
      ? "⚠️ Low margin — this quote may be underpriced."
      : profitMargin < 50
      ? "👍 Solid pricing — healthy professional quote."
      : "🔥 Premium pricing — strong margin and positioning.";

  const confidenceColor =
    profitMargin < 30 ? "#ff3b30" : profitMargin < 50 ? "#ff9500" : "#34c759";

  const marketPositionMessage =
    hourlyRate < suggestedHourlyRate
      ? "⬆️ You are pricing below your selected market."
      : hourlyRate > suggestedHourlyRate
      ? "💎 You are positioned above market as a premium artist."
      : "✅ You are aligned with the selected market rate.";

  useEffect(() => {
    setCity("Statewide Average");
    setHourlyRate(stateHourlyRates[state]);
    setTaxRate(stateTaxRates[state]);
  }, [state]);

  useEffect(() => {
    setHourlyRate(suggestedHourlyRate);
  }, [city]);

  function applyPreset(type: "small" | "medium" | "large" | "fullDay") {
    setPricingMode("hourly");

    if (type === "small") {
      setHours(1);
      setMaterials(20);
      setBoothRent(25);
    }

    if (type === "medium") {
      setHours(3);
      setMaterials(35);
      setBoothRent(50);
    }

    if (type === "large") {
      setHours(6);
      setMaterials(60);
      setBoothRent(85);
    }

    if (type === "fullDay") {
      setHours(8);
      setMaterials(100);
      setBoothRent(125);
    }
  }

  function validateQuote() {
    if (!clientName || !clientEmail || !tattooDescription) {
      alert("Please enter client name, email, and tattoo description.");
      return false;
    }

    if (pricingMode === "hourly" && hours <= 0) {
      alert("Estimated hours must be greater than 0.");
      return false;
    }

    if (pricingMode === "hourly" && hourlyRate <= 0) {
      alert("Hourly rate must be greater than $0.");
      return false;
    }

    if (pricingMode === "piece" && piecePrice <= 0) {
      alert("Piece price must be greater than $0.");
      return false;
    }

    if (discountAmount > subtotalBeforeDiscount) {
      alert("Discount cannot be larger than the subtotal.");
      return false;
    }

    if (finalTotal <= 0) {
      alert("Total must be greater than $0.");
      return false;
    }

    return true;
  }

  async function saveSettings() {
    const { error } = await supabase.from("shop_settings").upsert(
      {
        user_id: "demo-user",
        shop_name: shopName,
        shop_email: shopEmail,
        send_shop_copy: sendShopCopy,
        hourly_rate: hourlyRate,
        tax_rate: taxRate,
        apply_tax: applyTax,
      },
      { onConflict: "user_id" }
    );

    if (error) {
      alert("Settings did not save.");
      console.error(error);
      return;
    }

    alert("Settings saved!");
  }

  async function saveQuote() {
    if (!validateQuote()) return;

    const { error } = await supabase.from("tattoo_quotes").insert({
      user_id: "demo-user",
      client_name: clientName,
      client_email: clientEmail,
      tattoo_description: tattooDescription,
      estimated_hours: pricingMode === "hourly" ? hours : null,
      base_price: basePrice,
      material_cost: materials,
      tax_amount: taxAmount,
      total: finalTotal,
      status: "draft",
    });

    if (error) {
      alert("Quote did not save.");
      console.error(error);
      return;
    }

    alert("Quote saved!");
  }

async function sendQuoteEmail() {
  if (!validateQuote()) return;

  if (sendShopCopy && !shopEmail) {
    alert("Please enter a shop email or turn off shop email copy.");
    return;
  }

  try {
    // 1. Create quote link automatically
    const linkResponse = await fetch("/api/create-quote", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        shopName,
        artistName,
        shopEmail,
        clientName,
        clientEmail,
        tattooDescription,
        pricingMode,
        hours: pricingMode === "hourly" ? hours : null,
        total: finalTotal,
        discount: discountAmount,
        bookingLink,
        bookingInstructions,

        depositRequired,
        depositPercent,
        depositAmount,
        depositDueHours,
        paymentInstructions,
      }),
    });

    const linkText = await linkResponse.text();

    let linkData: any = {};

    try {
      linkData = JSON.parse(linkText);
    } catch {
      console.error("RAW RESPONSE FROM /api/create-quote:", linkText);
      alert("Quote link could not be created. Check your terminal.");
      return;
    }

    if (!linkResponse.ok) {
      console.error("QUOTE LINK ERROR:", linkData);
      alert("Quote link error: " + JSON.stringify(linkData));
      return;
    }

    if (!linkData.quoteUrl) {
      alert("Quote created but no link returned.");
      return;
    }

    const fullQuoteLink = `${window.location.origin}${linkData.quoteUrl}`;

    setQuoteLink(fullQuoteLink);

    // 2. Send email WITH link
    const emailResponse = await fetch("/api/send-quote", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        shopName,
        tattooerName: artistName,
        shopEmail,
        sendShopCopy,
        clientName,
        clientEmail,
        tattooDescription,
        pricingMode,
        hours: pricingMode === "hourly" ? hours : null,
        total: finalTotal.toFixed(2),

        quoteLink: fullQuoteLink,
        bookingLink,
        bookingInstructions,

        depositRequired,
        depositAmount,
        depositPercent,
        depositDueHours,
        paymentInstructions,
      }),
    });

    const emailData = await emailResponse.json();

    if (!emailResponse.ok) {
      console.error("EMAIL ERROR:", emailData);
      alert("Email failed: " + JSON.stringify(emailData));
      return;
    }

    alert(`Quote sent to ${clientName}. Email includes accept + booking.`);
  } catch (error: any) {
    console.error("SEND FAILED:", error);
    alert("Send failed: " + (error?.message || JSON.stringify(error)));
  }
}

async function createQuoteLink() {
  if (!validateQuote()) return;

  setIsCreatingQuoteLink(true);

  try {
   const response = await fetch("/api/create-quote", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    shopName,
    artistName,
    shopEmail,
    clientName,
    clientEmail,
    tattooDescription,
    pricingMode,
    hours: pricingMode === "hourly" ? hours : null,
    total: finalTotal,
    discount: discountAmount,
    bookingLink,

    depositRequired,
    depositPercent,
    depositAmount,
    depositDueHours,
    bookingInstructions,
  }),
});

    const text = await response.text();

    let data: any = {};

    try {
      data = JSON.parse(text);
    } catch {
      console.error("RAW RESPONSE FROM /api/create-quote:", text);
      alert("API did not return JSON. Check your VS Code terminal for the real error.");
      return;
    }

    if (!response.ok) {
      console.error("QUOTE CREATION API ERROR:", data);
      alert("API ERROR: " + JSON.stringify(data));
      return;
    }

    if (!data.quoteUrl) {
      console.error("Missing quoteUrl from API response:", data);
      alert("Quote was created, but the API did not return a quote link.");
      return;
    }

    const fullUrl = `${window.location.origin}${data.quoteUrl}`;

    setQuoteLink(fullUrl);

    try {
      await navigator.clipboard.writeText(fullUrl);
      alert("Quote link copied! You can paste it into a text, email, or Instagram DM.");
    } catch (error) {
      console.error("Clipboard failed:", error);
      alert("Quote link created, but your browser blocked auto-copy. Copy it from the link box.");
    }
  } catch (error: any) {
    console.error("FETCH FAILED WHILE CREATING QUOTE LINK:", error);
    alert("FETCH FAILED: " + (error?.message || JSON.stringify(error)));
  } finally {
    setIsCreatingQuoteLink(false);
  }
}

  async function copyExistingQuoteLink() {
    if (!quoteLink) return;

    try {
      await navigator.clipboard.writeText(quoteLink);
      alert("Quote link copied again.");
    } catch {
      alert("Copy failed. Please copy the link manually.");
    }
  }

  const inputStyle = {
    width: "100%",
    padding: 14,
    borderRadius: 10,
    border: "1px solid #bbb",
    fontSize: 16,
    boxSizing: "border-box" as const,
    marginBottom: 14,
  };

  const cardStyle = {
    background: "#ffffff",
    color: "#111",
    padding: 28,
    borderRadius: 20,
    marginBottom: 24,
    border: "1px solid #e5e5e5",
    boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
  };

  const primaryButtonStyle = {
    marginTop: 10,
    padding: "14px 18px",
    background: "linear-gradient(135deg,#ff5c00,#ff8a00)",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    fontWeight: "bold" as const,
    cursor: "pointer",
  };

  const darkButtonStyle = {
    marginTop: 10,
    padding: "14px 18px",
    background: "#222b2b",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    fontWeight: "bold" as const,
    cursor: "pointer",
  };

  const smallButtonStyle = {
    padding: "10px 12px",
    background: "#f2f2f2",
    color: "#111",
    border: "1px solid #ccc",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: "bold" as const,
  };

  return (
    <div style={{ background: "#0f0f0f", minHeight: "100vh", padding: 24, fontFamily: "Arial, sans-serif" }}>
      <div style={{ maxWidth: 950, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <img
            src="/apa-logo.png"
            alt="Artist Protection Alliance"
            style={{ maxWidth: 420, width: "100%", height: "auto" }}
          />
          <h1 style={{ color: "#ff5c00", marginTop: 20 }}>Premium Tattoo Pricing Engine</h1>
          <p style={{ color: "#ddd" }}>
            Tattooer-facing quote system. Customer quote stays clean.
          </p>
        </div>

        <div style={cardStyle}>
          <h2>Shop Branding</h2>

          <label>Shop / Brand Name</label>
          <input style={inputStyle} value={shopName} onChange={(e) => setShopName(e.target.value)} />

          <label>Tattooer / Artist Name</label>
          <input style={inputStyle} value={artistName} onChange={(e) => setArtistName(e.target.value)} />

          <label>Shop Email</label>
          <input style={inputStyle} type="email" value={shopEmail} onChange={(e) => setShopEmail(e.target.value)} />
          <label>Booking Link (Calendly, Google Calendar, etc.)</label>
<input
  style={inputStyle}
  value={bookingLink}
  onChange={(e) => setBookingLink(e.target.value)}
  placeholder="Paste your booking link"
/>

<label>Booking Instructions</label>
<textarea
  style={{ ...inputStyle, minHeight: 90 }}
  value={bookingInstructions}
  onChange={(e) => setBookingInstructions(e.target.value)}
  placeholder="How should the client book? (Example: Click link, select date, send deposit via Venmo @artistname)"
/>

         
<label style={{ display: "block", marginTop: 12 }}>
  <input
    type="checkbox"
    checked={depositRequired}
    onChange={(e) => setDepositRequired(e.target.checked)}
  />{" "}
  Deposit required to complete booking
</label>

{depositRequired && (
  <>
    <label>Deposit Percentage (%)</label>
    <input
      style={inputStyle}
      type="number"
      value={depositPercent}
      onChange={(e) => setDepositPercent(Number(e.target.value))}
    />
<label>Deposit Due After Booking</label>
<select
  style={inputStyle}
  value={depositDueHours}
  onChange={(e) => setDepositDueHours(Number(e.target.value))}
>
  <option value={12}>12 hours after booking</option>
  <option value={24}>24 hours after booking</option>
  <option value={48}>48 hours after booking</option>
</select>

    <p style={{ color: "#666", fontSize: 14 }}>
      Calculated Deposit: <strong>${depositAmount.toFixed(0)}</strong>
    </p>

    <label>Payment Instructions</label>
    <textarea
      style={{ ...inputStyle, minHeight: 90 }}
      value={paymentInstructions}
      onChange={(e) => setPaymentInstructions(e.target.value)}
      placeholder="Example: Send deposit via Venmo @artistname"
    />
  </>
)}

          <label style={{ display: "block", marginTop: 12 }}>
            <input type="checkbox" checked={sendShopCopy} onChange={(e) => setSendShopCopy(e.target.checked)} /> Send shop a copy
          </label>
        </div>

        <div style={cardStyle}>
          <h2>Client Quote Info</h2>

          <label>Client Name</label>
          <input style={inputStyle} value={clientName} onChange={(e) => setClientName(e.target.value)} />

          <label>Client Email</label>
          <input style={inputStyle} type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} />

          <label>Tattoo Description</label>
          <textarea
            style={{ ...inputStyle, minHeight: 100 }}
            value={tattooDescription}
            onChange={(e) => setTattooDescription(e.target.value)}
          />
        </div>

        <div style={cardStyle}>
          <h2>Pricing Engine</h2>

          <label>State</label>
          <select style={inputStyle} value={state} onChange={(e) => setState(e.target.value)}>
            {Object.entries(stateNames).map(([abbr, name]) => (
              <option key={abbr} value={abbr}>
                {name}
              </option>
            ))}
          </select>

          <label>City / Market</label>
          <select style={inputStyle} value={city} onChange={(e) => setCity(e.target.value)}>
            {cityOptions.map((cityName) => (
              <option key={cityName} value={cityName}>
                {cityName}
              </option>
            ))}
          </select>

          <p><strong>State average hourly rate:</strong> ${stateHourlyRates[state]}/hr</p>
          <p><strong>City-adjusted suggested rate:</strong> ${suggestedHourlyRate}/hr</p>
          <p style={{ color: "#666", fontSize: 14 }}>{marketPositionMessage}</p>

          <label>Override Hourly Rate</label>
          <input
            style={inputStyle}
            type="number"
            value={hourlyRate}
            onChange={(e) => setHourlyRate(Number(e.target.value))}
          />

          <button onClick={() => setHourlyRate(suggestedHourlyRate)} style={{ ...smallButtonStyle, marginBottom: 16 }}>
            Reset to Suggested Rate (${suggestedHourlyRate})
          </button>

          <div style={{ marginBottom: 20 }}>
            <p><strong>Quick Quote Presets</strong></p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              <button onClick={() => applyPreset("small")} style={smallButtonStyle}>Small</button>
              <button onClick={() => applyPreset("medium")} style={smallButtonStyle}>Medium</button>
              <button onClick={() => applyPreset("large")} style={smallButtonStyle}>Large</button>
              <button onClick={() => applyPreset("fullDay")} style={smallButtonStyle}>Full Day</button>
            </div>
          </div>

          <label>Pricing Mode</label>
          <select style={inputStyle} value={pricingMode} onChange={(e) => setPricingMode(e.target.value as "hourly" | "piece")}>
            <option value="hourly">Hourly</option>
            <option value="piece">Piece Work / Flat Rate</option>
          </select>

          {pricingMode === "hourly" && (
            <>
              <label>Estimated Hours</label>
              <input style={inputStyle} type="number" value={hours} onChange={(e) => setHours(Number(e.target.value))} />
            </>
          )}

          {pricingMode === "piece" && (
            <>
              <label>Piece Price / Flat Rate</label>
              <input style={inputStyle} type="number" value={piecePrice} onChange={(e) => setPiecePrice(Number(e.target.value))} />
            </>
          )}

          <label>Materials / Supplies</label>
          <input style={inputStyle} type="number" value={materials} onChange={(e) => setMaterials(Number(e.target.value))} />

          <label>Shop / Booth Rent Allocation</label>
          <input style={inputStyle} type="number" value={boothRent} onChange={(e) => setBoothRent(Number(e.target.value))} />

          <label style={{ display: "block", marginTop: 12 }}>
            <input type="checkbox" checked={applyTax} onChange={(e) => setApplyTax(e.target.checked)} /> Apply State Tax
          </label>

          {applyTax && (
            <>
              <label>Tax Rate (%)</label>
              <input style={inputStyle} type="number" value={taxRate} onChange={(e) => setTaxRate(Number(e.target.value))} />
            </>
          )}

          <label style={{ display: "block", marginTop: 12 }}>
            <input type="checkbox" checked={applyDiscount} onChange={(e) => setApplyDiscount(e.target.checked)} /> Add Large Piece Discount
          </label>

          {applyDiscount && (
            <>
              <label>Discount Amount ($)</label>
              <input style={inputStyle} type="number" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} />
            </>
          )}

          <button onClick={saveSettings} style={darkButtonStyle}>
            Save Shop Settings
          </button>
        </div>

        <div style={{ background: "#1a1a1a", color: "#f5f5f5", padding: 28, borderRadius: 20, boxShadow: "0 10px 25px rgba(0,0,0,0.25)" }}>
          <h2 style={{ color: "#ff5c00" }}>Profit Breakdown</h2>

          <p><strong>State:</strong> {stateNames[state]}</p>
          <p><strong>City / Market:</strong> {city}</p>
          <p><strong>City Rate Multiplier:</strong> {cityMultiplier.toFixed(2)}x</p>
          <p><strong>Suggested Hourly Rate:</strong> ${suggestedHourlyRate}/hr</p>
          <p><strong>Actual Hourly Rate Used:</strong> ${hourlyRate}/hr</p>
          <p><strong>Pricing Type:</strong> {pricingMode === "hourly" ? "Hourly" : "Piece Work"}</p>
          {pricingMode === "hourly" && <p><strong>Hours:</strong> {hours}</p>}
          <p><strong>Base Artist Price:</strong> ${basePrice.toFixed(2)}</p>
          <p><strong>Materials:</strong> ${materials.toFixed(2)}</p>
          <p><strong>Shop / Booth Rent Allocation:</strong> ${boothRent.toFixed(2)}</p>
          <p><strong>Discount:</strong> -${discountAmount.toFixed(2)}</p>
          <p><strong>Tax:</strong> ${taxAmount.toFixed(2)}</p>

          <hr style={{ borderColor: "#333" }} />

          <p><strong>Estimated Profit:</strong> ${profit.toFixed(2)}</p>
          <p><strong>Profit Margin:</strong> {profitMargin.toFixed(0)}%</p>
          <p style={{ color: confidenceColor, fontWeight: "bold" }}>{confidenceMessage}</p>

          <h2>Total Estimate Before Clean Rounding: ${total.toFixed(2)}</h2>
          <h2 style={{ color: "#ff5c00" }}>Clean Client Estimate: ${finalTotal.toFixed(0)}</h2>

          {finalTotal === minimumCharge && total < minimumCharge && (
            <p style={{ color: "#ff5c00" }}>
              Minimum charge applied (${minimumCharge})
            </p>
          )}

          <hr style={{ borderColor: "#333" }} />

          <h3 style={{ color: "#ff5c00" }}>Client Quote Preview</h3>
          <p><strong>Shop:</strong> {shopName || "Shop name"}</p>
          {artistName && <p><strong>Artist:</strong> {artistName}</p>}
          <p><strong>Description:</strong> {tattooDescription || "Tattoo description"}</p>
          {pricingMode === "hourly" && <p><strong>Estimated Hours:</strong> {hours}</p>}
          <p><strong>Total Estimate:</strong> ${finalTotal.toFixed(0)}</p>

          <button onClick={saveQuote} style={darkButtonStyle}>
            Save Quote
          </button>

          <button onClick={sendQuoteEmail} style={{ ...primaryButtonStyle, marginLeft: 10 }}>
            Send Customer Quote
          </button>

          <button
            onClick={createQuoteLink}
            disabled={isCreatingQuoteLink}
            style={{
              ...darkButtonStyle,
              marginLeft: 10,
              opacity: isCreatingQuoteLink ? 0.65 : 1,
            }}
          >
            {isCreatingQuoteLink ? "Creating Link..." : "Create Quote Link"}
          </button>

          {quoteLink && (
            <div style={{
              marginTop: 22,
              padding: 18,
              borderRadius: 14,
              background: "#111",
              border: "1px solid #333",
            }}>
              <p style={{ marginTop: 0, color: "#ff5c00", fontWeight: "bold" }}>
                Shareable Customer Quote Link
              </p>

              <input
                style={{
                  width: "100%",
                  padding: 12,
                  borderRadius: 8,
                  border: "1px solid #444",
                  background: "#fff",
                  color: "#111",
                  boxSizing: "border-box",
                  marginBottom: 10,
                }}
                value={quoteLink}
                readOnly
              />

              <button onClick={copyExistingQuoteLink} style={primaryButtonStyle}>
                Copy Link
              </button>

              <a
                href={quoteLink}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: "inline-block",
                  marginLeft: 10,
                  marginTop: 10,
                  padding: "14px 18px",
                  background: "#f2f2f2",
                  color: "#111",
                  borderRadius: 10,
                  textDecoration: "none",
                  fontWeight: "bold",
                }}
              >
                View Customer Quote
              </a>
            </div>
          )}

          <p style={{ fontSize: 12, color: "#888", marginTop: 24 }}>
            Powered by Artist Protection Alliance
          </p>
        </div>
      </div>
    </div>
  );
}