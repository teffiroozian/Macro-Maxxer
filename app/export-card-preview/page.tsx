import ExportOrderCard from "@/components/export/ExportOrderCard";

export default function ExportCardPreviewPage() {
  return (
    <main className="min-h-screen bg-neutral-950 p-4 sm:p-8">
      <div className="mx-auto max-w-[960px]">
        <ExportOrderCard
          restaurant={{
            id: "chipotle",
            name: "Chipotle Mexican Grill",
            logo: "/restaurants/chipotle/brand/logo.jpeg",
          }}
          orderName="Double Chicken Power Bowl"
          nutrition={{
            calories: 770,
            protein: 82,
            carbs: 58,
            totalFat: 23,
            sodium: 2140,
            cholesterol: 220,
            satFat: 5,
            transFat: 0,
            fiber: 13,
            sugars: 6,
          }}
          items={[
            { quantity: 2, label: "Chicken" },
            { quantity: 1, label: "Burrito Bowl" },
            { quantity: 1, label: "White Rice", detail: "light" },
            { quantity: 1, label: "Black Beans" },
            { quantity: 1, label: "Fajita Veggies", detail: "extra" },
            { quantity: 1, label: "Fresh Tomato Salsa" },
            { quantity: 1, label: "Romaine Lettuce" },
            { label: "No cheese, no sour cream", muted: true },
          ]}
          exportedAt="Sep 17, 2026"
        />
      </div>
    </main>
  );
}
