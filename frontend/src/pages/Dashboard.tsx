import { useEffect, useState } from 'react';
import { orderService } from '../services/order.service';
import { DashboardStat } from '../types';
import { FiEye, FiEyeOff } from 'react-icons/fi';

type YearFilter = number | 'all';

function Dashboard() {
  const [stats, setStats] = useState<DashboardStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAmounts, setShowAmounts] = useState(false);
  const [selectedYear, setSelectedYear] = useState<YearFilter>(new Date().getFullYear());

  useEffect(() => {
    loadStats(selectedYear === 'all' ? undefined : selectedYear);
  }, [selectedYear]);

  const loadStats = async (year?: number) => {
    try {
      const data = await orderService.getDashboardStats(year);
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('cs-CZ', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value).replace(/\s/g, ' '); // Non-breaking space
  };

  const totalValue = stats.reduce((sum, stat) => sum + Number(stat.totalValue || 0), 0);
  const totalCount = stats.reduce((sum, stat) => sum + stat.count, 0);
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 8 }, (_, i) => currentYear - i);

  // Odstíny modré barvy pro všechny statusy
  const getStatusColor = (index: number) => {
    const colors = [
      'bg-primary-400', // Světlejší
      'bg-primary-500', // Hlavní
      'bg-primary-600', // Tmavší
      'bg-primary-300',
      'bg-primary-700',
      'bg-primary-200',
      'bg-primary-800',
      'bg-primary-100',
      'bg-primary-900',
    ];
    return colors[index % colors.length] || 'bg-primary-500';
  };

  const getStatusHexColor = (index: number) => {
    const hexColors = [
      '#7393F7', // primary-400
      '#2749F5', // primary-500
      '#0A2CD4', // primary-600
      '#96AEF9', // primary-300
      '#08229F', // primary-700
      '#B9C9FB', // primary-200
      '#05176A', // primary-800
      '#DCE4FD', // primary-100
      '#030C35', // primary-900
    ];
    return hexColors[index % hexColors.length] || '#2749F5';
  };

  if (loading) {
    return <div className="text-center py-12">Načítání...</div>;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-2">
        <h1 className="text-lg sm:text-2xl font-bold text-gray-900">Dashboard</h1>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value === 'all' ? 'all' : parseInt(e.target.value, 10))}
            className="px-2 py-1.5 sm:px-3 sm:py-2 text-sm bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">Vše</option>
            {yearOptions.map((year) => (
              <option key={year} value={year}>
                Rok {year}
              </option>
            ))}
          </select>

          <button
            onClick={() => setShowAmounts(!showAmounts)}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 sm:px-4 sm:py-2 text-sm bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50"
          >
            {showAmounts ? (
              <>
                <FiEyeOff className="w-4 h-4" />
                <span>Skrýt částky</span>
              </>
            ) : (
              <>
                <FiEye className="w-4 h-4" />
                <span>Zobrazit částky</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6">
        <div className="bg-white rounded-lg shadow p-4 sm:p-6 border-l-4 border-primary-500">
          <h3 className="text-sm font-medium text-gray-500">Celkem zakázek</h3>
          <p className="mt-1.5 text-2xl sm:text-3xl font-bold text-gray-900">{totalCount}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 sm:p-6 border-l-4 border-primary-600">
          <h3 className="text-sm font-medium text-gray-500">Celková hodnota</h3>
          <p className="mt-1.5 text-xl sm:text-3xl font-bold text-gray-900">
            {showAmounts ? `${formatCurrency(totalValue)} Kč` : '••••••'}
          </p>
        </div>
      </div>

      {/* Stats by Status - Dlaždice */}
      <div>
        <h2 className="text-base sm:text-lg font-medium text-gray-900 mb-3">Zakázky podle stavu</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3">
          {stats.map((stat, index) => (
            <div
              key={stat.status}
              className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-4 border-l-4"
              style={{ borderLeftColor: getStatusHexColor(index) }}
            >
              <div className="flex items-center justify-between">
                <div className={`w-10 h-10 rounded-full ${getStatusColor(index)} flex items-center justify-center`}>
                  <span className="text-white font-bold text-lg">{stat.count}</span>
                </div>
              </div>
              <h3 className="mt-3 text-xs font-medium text-gray-500 uppercase tracking-wide truncate">
                {stat.status}
              </h3>
              <p className="mt-1 text-lg font-bold text-gray-900">
                {stat.count} {stat.count === 1 ? 'zakázka' : stat.count < 5 ? 'zakázky' : 'zakázek'}
              </p>
              <p className="mt-1 text-xs text-gray-600">
                {showAmounts
                  ? `${formatCurrency(Number(stat.totalValue || 0))} Kč`
                  : '•••••• Kč'}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
