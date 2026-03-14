export default function GuideSection() {
  return (
    <div className="mt-8 bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-3">
        Guide d'interpretation
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <div>
          <h4 className="font-medium text-gray-700 mb-2">
            Score composite
          </h4>
          <ul className="space-y-1 text-gray-600">
            <li>
              <span className="text-green-600 font-semibold">75-100:</span>{' '}
              Excellent
            </li>
            <li>
              <span className="text-yellow-600 font-semibold">50-74:</span>{' '}
              Bon
            </li>
            <li>
              <span className="text-red-600 font-semibold">&lt;50:</span> A
              eviter
            </li>
          </ul>
        </div>
        <div>
          <h4 className="font-medium text-gray-700 mb-2">
            Marge de securite
          </h4>
          <ul className="space-y-1 text-gray-600">
            <li>
              <span className="text-green-600 font-semibold">&gt;25%:</span>{' '}
              Opportunite
            </li>
            <li>
              <span className="text-yellow-600 font-semibold">10-25%:</span>{' '}
              Acceptable
            </li>
            <li>
              <span className="text-red-600 font-semibold">&lt;10%:</span>{' '}
              Risque
            </li>
          </ul>
        </div>
        <div>
          <h4 className="font-medium text-gray-700 mb-2">Criteres cles</h4>
          <ul className="space-y-1 text-gray-600">
            <li>ROE &gt;= 18%</li>
            <li>Marge nette &gt;= 12%</li>
            <li>Croissance revenus 5Y &gt;= 5%</li>
            <li>FCF positif (+ filtre min)</li>
            <li>Dette/Equity &lt;= 0.80</li>
            <li>Current Ratio &gt;= 1.0</li>
            <li>P/E &lt;= 22</li>
            <li>Price/FCF &lt;= 18</li>
            <li>Marge de sécurité &gt;= 30%</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
